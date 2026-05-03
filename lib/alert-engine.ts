import { createServerClient } from "./supabase-server"
import { computeDelayRisk } from "./core/risk-engine"

// -------------------------
// TYPES
// -------------------------
type Order = {
  id: string
  merchant_id: string
  created_at: string
  shipped_at?: string | null
  delivered_at?: string | null
  status?: string
}

type Message = {
  order_id: string
  content: string
  created_at?: string
  message_type?: string | null
}

type Alert = {
  id: string
  order_id: string
  merchant_id: string
  alert_type: string
  status: "active" | "resolved"
  severity: "low" | "medium" | "high" | "critical"
  risk_score: number
  signals?: string[]
  workflow_state?: "new" | "notified" | "expedited" | "recovered"
}

// -------------------------
// HELPERS
// -------------------------
function nowISO() {
  return new Date().toISOString()
}

function sameSignals(a: string[] = [], b: string[] = []) {
  if (a.length !== b.length) return false
  return [...a].sort().join("|") === [...b].sort().join("|")
}

// -------------------------
// LIFECYCLE
// -------------------------
async function resolveAlert(supabase: any, alert: Alert) {
  await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: nowISO(),
      updated_at: nowISO(),
    })
    .eq("id", alert.id)

  console.log("✅ Resolved:", alert.order_id)
}

async function reopenAlert(supabase: any, alert: Alert) {
  await supabase
    .from("alerts")
    .update({
      status: "active",
      reopened_at: nowISO(),
      updated_at: nowISO(),
    })
    .eq("id", alert.id)

  console.log("🔁 Reopened:", alert.order_id)
}

async function stopWorkflow(
  supabase: any,
  alert: Alert,
  outcome: "delivered" | "resolved"
) {
  await supabase
    .from("alerts")
    .update({
      workflow_state: "recovered",
      last_action_at: nowISO(),
      outcome,
      updated_at: nowISO(),
    })
    .eq("id", alert.id)

  console.log("🛑 Workflow stopped:", alert.order_id, outcome)
}

// -------------------------
// UPSERT
// -------------------------
async function upsertAlert(
  supabase: any,
  order: Order,
  existing: Alert | null,
  risk_score: number,
  severity: Alert["severity"],
  signals: string[]
) {
  const message = `Order ${order.id} delayed (${risk_score} risk)`

  if (existing) {
    const unchanged =
      existing.risk_score === risk_score &&
      existing.severity === severity &&
      sameSignals(existing.signals, signals)

    if (unchanged) return

    if (existing.status === "resolved") {
      await reopenAlert(supabase, existing)
    }

    const { error } = await supabase
      .from("alerts")
      .update({
        severity,
        risk_score,
        signals,
        message,
        updated_at: nowISO(),
      })
      .eq("id", existing.id)

    if (error) {
      console.error("❌ Update failed:", error)
      return
    }

    console.log("🚨 Updated:", order.id)
    return
  }

  const payload = {
    order_id: order.id,
    merchant_id: order.merchant_id,
    alert_type: "delay",
    severity,
    risk_score,
    signals,
    message,
    confidence: 0.9,
    status: "active",
    workflow_state: "new",
    action_taken: "none",
    created_at: nowISO(),
    updated_at: nowISO(),
  }

  console.log("📦 Creating alert:", payload)

  const { error } = await supabase
    .from("alerts")
    .insert(payload)

  if (error) {
    console.error("❌ Insert failed:", error)
    return
  }

  console.log("🚨 New alert:", order.id)
}

// -------------------------
// MAIN ENGINE
// -------------------------
export async function runAlertEngine() {
  const supabase = createServerClient()

  console.log("⚡ Alert Engine started")

  // -------------------------
  // FETCH ORDERS
  // -------------------------
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")

  if (ordersError) {
    console.error("❌ Orders fetch failed:", ordersError)
    return
  }

  const orderList = (orders || []) as Order[]

  if (orderList.length === 0) {
    console.log("⚠️ No orders found")
    return
  }

  // -------------------------
  // FETCH MESSAGES (FIXED)
  // -------------------------
  const { data: rawMessages, error: msgError } = await supabase
    .from("customer_messages")
    .select("order_id, message, created_at, channel")
    .order("created_at", { ascending: true })

  if (msgError) {
    console.error("❌ Messages fetch failed:", msgError)
    return
  }

  // -------------------------
  // NORMALIZE + GROUP
  // -------------------------
  const grouped: Record<string, Message[]> = {}

  for (const msg of rawMessages || []) {
    if (!msg.order_id || !msg.message) continue

    if (!grouped[msg.order_id]) {
      grouped[msg.order_id] = []
    }

    grouped[msg.order_id].push({
      order_id: msg.order_id,
      content: msg.message, // ✅ normalize
      created_at: msg.created_at,
      message_type: msg.channel,
    })
  }

  // -------------------------
  // FETCH ALERTS
  // -------------------------
  const { data: existingAlerts, error: alertError } = await supabase
    .from("alerts")
    .select("*")
    .eq("alert_type", "delay")

  if (alertError) {
    console.error("❌ Alerts fetch failed:", alertError)
    return
  }

  const alertMap: Record<string, Alert> = {}

  for (const a of existingAlerts || []) {
    alertMap[a.order_id] = a
  }

  // -------------------------
  // PROCESS
  // -------------------------
  const RESOLVE_THRESHOLD = 25

  for (const order of orderList) {
    if (!order.merchant_id) {
      console.warn("⚠️ Order missing merchant_id:", order.id)
      continue
    }

    const msgs = grouped[order.id] || []
    const existing = alertMap[order.id] || null
    const isDelivered = !!order.delivered_at

    if (msgs.length === 0 && !isDelivered) continue

    const risk = computeDelayRisk(msgs)

    console.log("📊 Risk computed:", {
      order: order.id,
      score: risk.score,
      severity: risk.severity,
      signals: risk.signals,
    })

    // -------------------------
    // STOP CONDITIONS
    // -------------------------
    if (isDelivered || risk.score < RESOLVE_THRESHOLD) {
      if (existing?.status === "active") {
        await resolveAlert(supabase, existing)

        await stopWorkflow(
          supabase,
          existing,
          isDelivered ? "delivered" : "resolved"
        )
      }
      continue
    }

    // -------------------------
    // UPSERT
    // -------------------------
    await upsertAlert(
      supabase,
      order,
      existing,
      risk.score,
      risk.severity,
      risk.signals
    )
  }

  console.log("✅ Alert Engine finished")
}
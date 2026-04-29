import { createServerClient } from "./supabase-server"

type Order = {
  id: string
  created_at: string
  shipped_at?: string | null
  delivered_at?: string | null
  status?: string
}

// -------------------------
// 🧮 Helpers
// -------------------------
function nowISO() {
  return new Date().toISOString()
}

function getDaysDiff(date: string) {
  const now = Date.now()
  const past = new Date(date).getTime()
  return Math.floor((now - past) / (1000 * 60 * 60 * 24))
}

// -------------------------
// 🧠 Risk Logic
// -------------------------
function computeDelayRisk(order: Order) {
  let risk_score = 0

  if (!order.shipped_at) {
    const daysSinceOrder = getDaysDiff(order.created_at)
    if (daysSinceOrder > 2) risk_score += 40
  }

  if (order.shipped_at && !order.delivered_at) {
    const daysSinceShip = getDaysDiff(order.shipped_at)
    if (daysSinceShip > 5) risk_score += 50
  }

  return risk_score
}

function getSeverity(score: number) {
  if (score >= 80) return "critical"
  if (score >= 60) return "high"
  if (score >= 40) return "medium"
  return "low"
}

// -------------------------
// ✉️ Message Generator
// -------------------------
function generateMessageContent(alert: any) {
  if (alert.alert_type === "delay") {
    return `Hi! Your order ${alert.order_id} is experiencing a delay. We're monitoring it closely and will keep you updated.`
  }

  return `Update regarding your order ${alert.order_id}.`
}

// -------------------------
// 🔄 Lifecycle handlers
// -------------------------
async function resolveAlert(supabase: any, alert: any) {
  const { error } = await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: nowISO(),
      updated_at: nowISO(),
    })
    .eq("id", alert.id)

  if (error) {
    console.error("❌ Resolve failed:", error)
    return
  }

  console.log("✅ Resolved:", alert.order_id)
}

async function reopenAlert(supabase: any, alert: any) {
  const { error } = await supabase
    .from("alerts")
    .update({
      status: "active",
      reopened_at: nowISO(),
      updated_at: nowISO(),
    })
    .eq("id", alert.id)

  if (error) {
    console.error("❌ Reopen failed:", error)
    return
  }

  console.log("🔁 Reopened:", alert.order_id)
}

// -------------------------
// 📩 Trigger Message (rate-limited)
// -------------------------
async function triggerMessage(supabase: any, alert: any) {
  if (alert.severity === "low") return

  // Prevent duplicate per alert
  const { data: existing, error: checkError } = await supabase
    .from("messages")
    .select("id")
    .eq("alert_id", alert.id)
    .maybeSingle()

  if (checkError) {
    console.error("❌ Message check failed:", checkError)
    return
  }

  if (existing) return

  // 🔒 24h cooldown per order
  const { data: recent, error: recentError } = await supabase
    .from("messages")
    .select("created_at")
    .eq("order_id", alert.order_id)
    .order("created_at", { ascending: false })
    .limit(1)

  if (recentError) {
    console.error("❌ Cooldown check failed:", recentError)
    return
  }

  const last = recent?.[0]

  if (last) {
    const hours =
      (Date.now() - new Date(last.created_at).getTime()) /
      (1000 * 60 * 60)

    if (hours < 24) {
      console.log("⏳ Cooldown:", alert.order_id)
      return
    }
  }

  // Insert message
  const { error } = await supabase.from("messages").insert({
    alert_id: alert.id,
    order_id: alert.order_id,
    message_type: alert.alert_type,
    content: generateMessageContent(alert),
    status: "sent",
    created_at: nowISO(),
  })

  if (error) {
    console.error("❌ Message insert failed:", error)
    return
  }

  // Mark alert acted
  await supabase
    .from("alerts")
    .update({
      action_taken: "message_sent",
      updated_at: nowISO(),
    })
    .eq("id", alert.id)

  console.log("📩 Message sent:", alert.order_id)
}

// -------------------------
// 🚀 MAIN ENGINE (LIFECYCLE)
// -------------------------
export async function runAlertEngine() {
  const supabase = createServerClient()

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")

  if (error) {
    console.error("❌ Failed to fetch orders:", error)
    return
  }

  for (const order of orders || []) {
    const risk_score = computeDelayRisk(order)

    // Fetch existing alert (any status)
    const { data: existing, error: fetchError } = await supabase
      .from("alerts")
      .select("*")
      .eq("order_id", order.id)
      .eq("alert_type", "delay")
      .maybeSingle()

    if (fetchError) {
      console.error("❌ Fetch alert failed:", fetchError)
      continue
    }

    // -------------------------
    // ✅ NO RISK → RESOLVE
    // -------------------------
    if (risk_score < 40) {
      if (existing && existing.status === "active") {
        await resolveAlert(supabase, existing)
      }
      continue
    }

    const severity = getSeverity(risk_score)

    // -------------------------
    // 🔁 EXISTING ALERT
    // -------------------------
    if (existing) {
      if (existing.status === "resolved") {
        await reopenAlert(supabase, existing)
      }

      const { data, error } = await supabase
        .from("alerts")
        .update({
          severity,
          risk_score,
          message: `Order ${order.id} delayed (${risk_score} risk)`,
          updated_at: nowISO(),
        })
        .eq("id", existing.id)
        .select()

      if (error) {
        console.error("❌ Update failed:", error)
        continue
      }

      const alertRecord = data?.[0]
      if (!alertRecord) continue

      console.log("🚨 Updated alert:", order.id)

      await triggerMessage(supabase, alertRecord)
      continue
    }

    // -------------------------
    // 🆕 NEW ALERT
    // -------------------------
    const { data, error } = await supabase
      .from("alerts")
      .insert({
        order_id: order.id,
        alert_type: "delay",
        severity,
        risk_score,
        confidence: 0.9,
        message: `Order ${order.id} delayed (${risk_score} risk)`,
        status: "active",
        action_taken: "none",
        created_at: nowISO(),
        updated_at: nowISO(),
      })
      .select()

    if (error) {
      console.error("❌ Insert failed:", error)
      continue
    }

    const alertRecord = data?.[0]
    if (!alertRecord) continue

    console.log("🚨 New alert:", order.id)

    await triggerMessage(supabase, alertRecord)
  }
}
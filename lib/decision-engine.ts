import { createServerClient } from "./supabase-server"

// -------------------------
// 🧠 Types
// -------------------------
export type Alert = {
  id: string
  order_id: string
  alert_type: string
  severity: "low" | "medium" | "high" | "critical"
  risk_score: number
  confidence?: number
  status?: string
  created_at?: string
}

export type ActionDecision = {
  type:
    | "notify_customer"
    | "expedite_shipping"
    | "refund"
    | "monitor"
  priority: "low" | "medium" | "high"
  reason: string
  score: number
}

// -------------------------
// 🎯 MAIN DECISION FUNCTION
// -------------------------
export function decideAction(alert: Alert): ActionDecision {
  const decisions: ActionDecision[] = [
    evaluateRefund(alert),
    evaluateExpedite(alert),
    evaluateNotify(alert),
    evaluateMonitor(alert),
  ]

  // Sort by score DESC, then priority
  const best = decisions.sort((a, b) => {
    if (b.score === a.score) {
      return priorityWeight(b.priority) - priorityWeight(a.priority)
    }
    return b.score - a.score
  })[0]

  return best
}

// -------------------------
// ⚖️ Priority Weighting
// -------------------------
function priorityWeight(p: string) {
  if (p === "high") return 3
  if (p === "medium") return 2
  return 1
}

// -------------------------
// 🧮 Decision Evaluators
// -------------------------
function evaluateRefund(alert: Alert): ActionDecision {
  let score = 0
  let reason = "No refund needed"

  if (alert.alert_type === "delay") {
    if (alert.severity === "critical") {
      score += 90
      reason = "Critical delay → refund to prevent churn"
    }

    if (alert.risk_score >= 90) {
      score += 10
    }
  }

  return {
    type: "refund",
    priority: "high",
    score,
    reason,
  }
}

function evaluateExpedite(alert: Alert): ActionDecision {
  let score = 0
  let reason = "No expedite needed"

  if (alert.alert_type === "delay") {
    if (alert.severity === "high") {
      score += 80
      reason = "High delay → expedite shipping"
    }

    if (alert.risk_score >= 70) {
      score += 10
    }
  }

  return {
    type: "expedite_shipping",
    priority: "high",
    score,
    reason,
  }
}

function evaluateNotify(alert: Alert): ActionDecision {
  let score = 0
  let reason = "No notification needed"

  if (alert.alert_type === "delay") {
    if (alert.severity === "medium") {
      score += 70
      reason = "Medium delay → notify customer"
    }

    if (alert.severity === "high") {
      score += 40 // fallback
      reason = "High delay fallback → notify"
    }
  }

  return {
    type: "notify_customer",
    priority: "medium",
    score,
    reason,
  }
}

function evaluateMonitor(alert: Alert): ActionDecision {
  return {
    type: "monitor",
    priority: "low",
    score: 10,
    reason: "No strong signal → monitor only",
  }
}

// -------------------------
// 🔒 Prevent duplicate actions
// -------------------------
async function actionExists(
  supabase: any,
  alert: Alert,
  type: string
) {
  const { data } = await supabase
    .from("actions")
    .select("id")
    .eq("alert_id", alert.id)
    .eq("action_type", type)
    .maybeSingle()

  return !!data
}

// -------------------------
// 🧾 Persist Action
// -------------------------
async function createAction(
  supabase: any,
  alert: Alert,
  decision: ActionDecision
) {
  // Skip monitor
  if (decision.type === "monitor") return

  const exists = await actionExists(
    supabase,
    alert,
    decision.type
  )

  if (exists) {
    console.log("⚠️ Action already exists:", decision.type)
    return
  }

  const { error } = await supabase.from("actions").insert({
    alert_id: alert.id,
    order_id: alert.order_id,
    action_type: decision.type,
    status: "pending",
  })

  if (error) {
    console.error("❌ Action insert failed:", {
      message: error.message,
      code: error.code,
    })
    return
  }

  console.log(
    `⚡ Action created: ${decision.type} → ${alert.order_id}`
  )
}

// -------------------------
// 🚀 MAIN ENGINE
// -------------------------
export async function runDecisionEngine() {
  const supabase = createServerClient()

  // 1. Fetch ACTIVE alerts only
  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("status", "active")

  if (error) {
    console.error("❌ Failed to fetch alerts:", error)
    return
  }

  for (const alert of alerts || []) {
    // 2. Decide
    const decision = decideAction(alert)

    console.log("🧠 Decision:", {
      order: alert.order_id,
      action: decision.type,
      score: decision.score,
      reason: decision.reason,
    })

    // 3. Persist action
    await createAction(supabase, alert, decision)
  }
}
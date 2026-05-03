import { createServerClient } from "./supabase-server"
import { getMerchantConfig } from "./merchant-config"

// -------------------------
// 🧠 TYPES
// -------------------------
export type Alert = {
  id: string
  order_id: string
  merchant_id: string
  alert_type: string
  severity: "low" | "medium" | "high" | "critical"
  risk_score: number
  status?: "active" | "resolved"

  workflow_state?: "new" | "notified" | "expedited" | "recovered"
  last_action_at?: string | null
  workflow_step?: number
}

export type ActionType =
  | "notify_customer"
  | "expedite_shipping"
  | "refund"

export type ActionDecision = {
  type: ActionType
  priority: "low" | "medium" | "high"
  reason: string
  score: number
}

export type DecisionEngineResult = {
  success: boolean
  processed: number
  errors: number
}

// -------------------------
// 🧮 TIME HELPERS
// -------------------------
function getHoursSince(date?: string | null) {
  if (!date) return 999

  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60)
}

// -------------------------
// 🔁 STATE MACHINE
// -------------------------
function getNextState(actionType: ActionType) {
  switch (actionType) {
    case "notify_customer":
      return "notified"
    case "expedite_shipping":
      return "expedited"
    case "refund":
      return "recovered"
    default:
      return "new"
  }
}

// -------------------------
// 🧠 SAFE CONFIG
// -------------------------
function getSafeAutomationConfig(config: any) {
  return {
    notify_customer: config?.automation_config?.notify_customer ?? true,
    expedite_after_hours: config?.automation_config?.expedite_after_hours ?? 6,
    refund_after_hours: config?.automation_config?.refund_after_hours ?? 24,
    auto_refund: config?.automation_config?.auto_refund ?? true,
  }
}

// -------------------------
// 🎯 DECISION LOGIC
// -------------------------
function decideActionsStateful(
  alert: Alert,
  config: any
): ActionDecision[] {
  const state = alert.workflow_state || "new"
  const hoursSinceLast = getHoursSince(alert.last_action_at)
  const automation = getSafeAutomationConfig(config)

  if (state === "recovered") return []

  if (state === "new" && automation.notify_customer) {
    return [{
      type: "notify_customer",
      priority: "high",
      score: 80,
      reason: "Initial delay → notify customer",
    }]
  }

  if (
    state === "notified" &&
    hoursSinceLast >= automation.expedite_after_hours
  ) {
    return [{
      type: "expedite_shipping",
      priority: "high",
      score: 85,
      reason: `No resolution after ${automation.expedite_after_hours}h → expedite`,
    }]
  }

  if (
    state === "expedited" &&
    hoursSinceLast >= automation.refund_after_hours &&
    automation.auto_refund
  ) {
    return [{
      type: "refund",
      priority: "high",
      score: 95,
      reason: `Still unresolved after ${automation.refund_after_hours}h → refund`,
    }]
  }

  return []
}

// -------------------------
// 💰 PAYLOAD
// -------------------------
function buildActionPayload(alert: Alert, decision: ActionDecision) {
  switch (decision.type) {
    case "refund":
      return {
        amount: estimateRefund(alert),
        reason: "delay_compensation",
      }
    case "expedite_shipping":
      return { priority: "high" }
    case "notify_customer":
      return { template: "delay_apology" }
    default:
      return {}
  }
}

function estimateRefund(alert: Alert) {
  if (alert.severity === "critical") return 50
  if (alert.severity === "high") return 25
  return 10
}

// -------------------------
// 🔒 IDEMPOTENCY CHECK
// -------------------------
async function actionExists(
  supabase: any,
  alert: Alert,
  type: ActionType
) {
  const { data, error } = await supabase
    .from("actions")
    .select("id")
    .eq("alert_id", alert.id)
    .eq("action_type", type)
    .in("status", ["pending", "completed"])
    .limit(1)

  if (error) return false
  return (data?.length ?? 0) > 0
}

// -------------------------
// 🧾 CREATE ACTION
// -------------------------
async function createAction(
  supabase: any,
  alert: Alert,
  decision: ActionDecision
) {
  if (alert.status !== "active") return
  if (alert.workflow_state === "recovered") return
  if (decision.score < 50) return

  const exists = await actionExists(supabase, alert, decision.type)
  if (exists) return

  const payload = buildActionPayload(alert, decision)
  const isFinal = decision.type === "refund"

  const { error: insertError } = await supabase.from("actions").insert({
    alert_id: alert.id,
    order_id: alert.order_id,
    merchant_id: alert.merchant_id,
    action_type: decision.type,
    status: isFinal ? "completed" : "pending",
    executed_at: isFinal ? new Date().toISOString() : null,
    priority: decision.priority,
    payload,
    metadata: {
      reason: decision.reason,
      score: decision.score,
    },
  })

  if (insertError) throw insertError

  const nextState = getNextState(decision.type)

  const updatePayload: any = {
    workflow_state: nextState,
    last_action_at: new Date().toISOString(),
    workflow_step: (alert.workflow_step || 0) + 1,
  }

  if (isFinal) {
    updatePayload.status = "resolved"
    updatePayload.resolved_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from("alerts")
    .update(updatePayload)
    .eq("id", alert.id)

  if (updateError) throw updateError
}

// -------------------------
// 🛡️ CONSISTENCY
// -------------------------
async function enforceConsistency(supabase: any) {
  await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("workflow_state", "recovered")
    .neq("status", "resolved")
}

// -------------------------
// 🚀 MAIN ENGINE
// -------------------------
export async function runDecisionEngine(): Promise<DecisionEngineResult> {
  const supabase = createServerClient()

  let processed = 0
  let errors = 0

  try {
    await enforceConsistency(supabase)

    const { data: alerts, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("status", "active")

    if (error) throw error

    if (!alerts?.length) {
      return {
        success: true,
        processed: 0,
        errors: 0,
      }
    }

    for (const alert of alerts) {
      if (!alert || alert.severity === "low") continue
      if (alert.workflow_state === "recovered") continue

      try {
        const config = await getMerchantConfig(alert.merchant_id)

        const decisions = decideActionsStateful(alert, config)

        for (const decision of decisions) {
          await createAction(supabase, alert, decision)
          processed++
        }
      } catch (err) {
        errors++
        console.error("❌ Alert failed:", alert.id, err)
      }
    }

    return {
      success: errors === 0,
      processed,
      errors,
    }
  } catch (err) {
    console.error("❌ Decision Engine crashed:", err)

    return {
      success: false,
      processed,
      errors: errors + 1,
    }
  }
}
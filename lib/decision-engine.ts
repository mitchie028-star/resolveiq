import { createServerClient } from "./supabase-server"
import { getMerchantConfig } from "./merchant-config"
import type {
  Alert,
  ActionDecision,
  ActionType,
  DecisionEngineResult,
  WorkflowState,
} from "./workflow/types"

// -------------------------
// 🧠 CONFIG
// -------------------------
const MIN_SCORE_THRESHOLD = 50

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
function getNextState(actionType: ActionType): WorkflowState {
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
    expedite_after_hours:
      config?.automation_config?.expedite_after_hours ?? 6,
    refund_after_hours:
      config?.automation_config?.refund_after_hours ?? 24,
    auto_refund: config?.automation_config?.auto_refund ?? true,
  }
}

// -------------------------
// 🎯 DECISION LOGIC
// -------------------------
function decideActions(
  alert: Alert,
  config: any
): ActionDecision[] {
  const state = alert.workflow_state || "new"
  const hoursSince = getHoursSince(alert.last_action_at)
  const automation = getSafeAutomationConfig(config)

  if (state === "recovered") return []

  // 1️⃣ INITIAL NOTIFICATION
  if (state === "new" && automation.notify_customer) {
    return [{
      type: "notify_customer",
      priority: "high",
      score: 80,
      reason: "Initial delay → notify customer",
    }]
  }

  // 2️⃣ ESCALATION
  if (
    state === "notified" &&
    hoursSince >= automation.expedite_after_hours
  ) {
    return [{
      type: "expedite_shipping",
      priority: "high",
      score: 85,
      reason: `No resolution after ${automation.expedite_after_hours}h → expedite`,
    }]
  }

  // 3️⃣ REFUND
  if (
    state === "expedited" &&
    hoursSince >= automation.refund_after_hours &&
    automation.auto_refund
  ) {
    return [{
      type: "refund",
      priority: "high",
      score: 95,
      reason: `Unresolved after ${automation.refund_after_hours}h → refund`,
    }]
  }

  return []
}

// -------------------------
// 💰 PAYLOAD BUILDER
// -------------------------
function buildPayload(alert: Alert, decision: ActionDecision) {
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
  if (decision.score < MIN_SCORE_THRESHOLD) return

  const exists = await actionExists(supabase, alert, decision.type)
  if (exists) return

  const payload = buildPayload(alert, decision)
  const isFinal = decision.type === "refund"

  const { error } = await supabase.from("actions").insert({
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

  if (error) throw error

  const nextState = getNextState(decision.type)

  const update: any = {
    workflow_state: nextState,
    last_action_at: new Date().toISOString(),
    workflow_step: (alert.workflow_step || 0) + 1,
  }

  if (isFinal) {
    update.status = "resolved"
    update.resolved_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from("alerts")
    .update(update)
    .eq("id", alert.id)

  if (updateError) throw updateError
}

// -------------------------
// 🛡️ CONSISTENCY FIX
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
// 🚀 MAIN ENGINE (CLEAN CONTRACT)
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
        const decisions = decideActions(alert, config)

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
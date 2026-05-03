import { createServerClient } from "./supabase-server"

// -------------------------
// ⚙️ CONFIG
// -------------------------
const MAX_RETRIES = 3
const BATCH_SIZE = 20

// -------------------------
// 📦 TYPES
// -------------------------
export type ActionResult = {
  success: boolean
  processed: string[]
  errors: string[]
}

type ActionType =
  | "refund"
  | "discount"
  | "reship"
  | "notify_customer"
  | "expedite_shipping"

type ActionStatus = "pending" | "failed" | "in_progress" | "completed"

type ActionRecord = {
  id: string
  action_type: ActionType
  order_id: string
  status: ActionStatus
  payload?: any
  metadata?: any
  created_at?: string
  retry_count?: number
  next_retry_at?: string | null
}

// -------------------------
// 🧠 PRIORITY ENGINE
// -------------------------
function computePriorityScore(action: ActionRecord) {
  let score = 0

  const decisionScore = action.metadata?.score ?? 0
  score += decisionScore

  const typeWeight: Record<ActionType, number> = {
    refund: 40,
    reship: 35,
    expedite_shipping: 30,
    discount: 25,
    notify_customer: 20,
  }

  score += typeWeight[action.action_type] || 0

  if (action.created_at) {
    const ageMinutes =
      (Date.now() - new Date(action.created_at).getTime()) / (1000 * 60)

    score += Math.min(20, Math.floor(ageMinutes / 10))
  }

  score += (action.retry_count || 0) * 10

  return score
}

// -------------------------
// 🔒 VALIDATION
// -------------------------
function isValidAction(action: ActionRecord) {
  if (!action.action_type) return false

  const requiresPayload: ActionType[] = [
    "refund",
    "notify_customer",
    "expedite_shipping",
    "discount",
  ]

  if (requiresPayload.includes(action.action_type) && !action.payload) {
    return false
  }

  return true
}

// -------------------------
// 🔒 LOCKING
// -------------------------
async function markInProgress(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("actions")
    .update({
      status: "in_progress",
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "failed"])
    .select()

  if (error || !data?.length) return false
  return true
}

// -------------------------
// 🎯 ACTION REGISTRY
// -------------------------
const ACTION_HANDLERS: Record<
  ActionType,
  (action: ActionRecord) => Promise<void>
> = {
  refund: handleRefund,
  discount: handleDiscount,
  reship: handleReship,
  notify_customer: handleNotify,
  expedite_shipping: handleExpedite,
}

// -------------------------
// EXECUTOR
// -------------------------
async function executeAction(action: ActionRecord) {
  const handler = ACTION_HANDLERS[action.action_type]

  if (!handler) {
    console.warn("🤷 No handler for:", action.action_type)
    return
  }

  return handler(action)
}

// -------------------------
// SUCCESS UPDATE
// -------------------------
async function updateSuccess(supabase: any, id: string) {
  await supabase
    .from("actions")
    .update({
      status: "completed",
      next_retry_at: null,
      updated_at: new Date().toISOString(),
      result: { success: true },
    })
    .eq("id", id)
}

// -------------------------
// FAILURE UPDATE
// -------------------------
async function updateFailure(
  supabase: any,
  action: ActionRecord,
  errorMessage: string
) {
  const retryCount = (action.retry_count || 0) + 1
  const delayMinutes = Math.pow(2, retryCount)

  const nextRetry = new Date(
    Date.now() + delayMinutes * 60 * 1000
  ).toISOString()

  await supabase
    .from("actions")
    .update({
      status: "failed",
      retry_count: retryCount,
      next_retry_at: nextRetry,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(action.metadata || {}),
        last_error: errorMessage,
      },
      result: {
        success: false,
        error: errorMessage,
      },
    })
    .eq("id", action.id)

  console.log(`🔁 Retry in ${delayMinutes} min (attempt ${retryCount})`)
}

// -------------------------
// 🚀 MAIN EXECUTOR
// -------------------------
export async function runActionExecutor(): Promise<ActionResult> {
  const supabase = createServerClient()
  const now = new Date().toISOString()

  const processed: string[] = []
  const errors: string[] = []

  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .in("status", ["pending", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .limit(BATCH_SIZE)

  if (error) {
    return {
      success: false,
      processed: [],
      errors: [error.message],
    }
  }

  const prioritizedActions: ActionRecord[] = (actions || [])
    .map((a: any) => ({
      ...a,
      priority_score: computePriorityScore(a),
    }))
    .sort((a, b) => b.priority_score - a.priority_score)

  for (const action of prioritizedActions) {
    if (
      action.status === "failed" &&
      (action.retry_count || 0) >= MAX_RETRIES
    ) {
      console.log("🚫 Max retries reached:", action.id)
      continue
    }

    if (!isValidAction(action)) continue

    const locked = await markInProgress(supabase, action.id)
    if (!locked) continue

    try {
      console.log("⚡ Executing:", action.action_type)

      await executeAction(action)

      await updateSuccess(supabase, action.id)

      processed.push(action.id)
    } catch (err: any) {
      const message = err?.message || "unknown_error"

      console.error("❌ Execution failed:", message)

      await updateFailure(supabase, action, message)

      errors.push(`${action.id}: ${message}`)
    }
  }

  return {
    success: errors.length === 0,
    processed,
    errors,
  }
}

// -------------------------
// 🧠 HANDLERS
// -------------------------
async function handleRefund(action: ActionRecord) {
  console.log("💸 Refund:", action.order_id, action.payload)
  await fakeDelay()
}

async function handleDiscount(action: ActionRecord) {
  console.log("🏷️ Discount:", action.order_id, action.payload)
  await fakeDelay()
}

async function handleReship(action: ActionRecord) {
  console.log("📦 Reship:", action.order_id)
  await fakeDelay()
}

async function handleNotify(action: ActionRecord) {
  console.log("📩 Notify:", action.order_id, action.payload)
  await fakeDelay()
}

async function handleExpedite(action: ActionRecord) {
  console.log("🚚 Expedite:", action.order_id, action.payload)
  await fakeDelay()
}

// -------------------------
// 🧪 MOCK
// -------------------------
function fakeDelay() {
  return new Promise((res) => setTimeout(res, 300))
}
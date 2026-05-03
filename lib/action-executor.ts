import { createServerClient } from "./supabase-server"

// -------------------------
// ⚙️ CONFIG
// -------------------------
const MAX_RETRIES = 3
const BATCH_SIZE = 20

// -------------------------
// 🧠 PRIORITY ENGINE
// -------------------------
function computePriorityScore(action: any) {
  let score = 0

  // 🧠 Decision strength
  const decisionScore = action.metadata?.score ?? 0
  score += decisionScore

  // ⚠️ Action type weight
  const typeWeight: Record<string, number> = {
    refund: 40,
    reship: 35,
    expedite_shipping: 30,
    discount: 25,
    notify_customer: 20,
  }

  score += typeWeight[action.action_type] || 0

  // ⏳ Age boost
  if (action.created_at) {
    const ageMinutes =
      (Date.now() - new Date(action.created_at).getTime()) /
      (1000 * 60)

    score += Math.min(20, Math.floor(ageMinutes / 10))
  }

  // 🔁 Retry boost
  const retries = action.retry_count || 0
  score += retries * 10

  return score
}

// -------------------------
// 🚀 MAIN EXECUTOR
// -------------------------
export async function runActionExecutor() {
  const supabase = createServerClient()
  const now = new Date().toISOString()

  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .in("status", ["pending", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .limit(BATCH_SIZE)

  if (error) {
    console.error("❌ Failed to fetch actions:", error)
    return
  }

  // -------------------------
  // 🧠 PRIORITIZE
  // -------------------------
  const prioritizedActions = (actions || [])
    .map((a) => ({
      ...a,
      priority_score: computePriorityScore(a),
    }))
    .sort((a, b) => b.priority_score - a.priority_score)

  for (const action of prioritizedActions) {
    // -------------------------
    // 🚫 MAX RETRIES
    // -------------------------
    if (
      action.status === "failed" &&
      (action.retry_count || 0) >= MAX_RETRIES
    ) {
      console.log("🚫 Max retries reached:", action.id)
      continue
    }

    // -------------------------
    // 🔒 VALIDATION
    // -------------------------
    if (!isValidAction(action)) continue

    // -------------------------
    // 🔒 LOCK
    // -------------------------
    const locked = await markInProgress(supabase, action.id)
    if (!locked) continue

    try {
      console.log("🧠 Priority:", {
        action: action.action_type,
        order: action.order_id,
        score: action.priority_score,
      })

      console.log("⚡ Executing:", action.action_type)

      await executeAction(action)

      await updateSuccess(supabase, action.id)
    } catch (err: any) {
      console.error("❌ Execution failed:", err.message)

      await updateFailure(supabase, action, err.message)
    }
  }
}

// -------------------------
// 🔒 VALIDATION
// -------------------------
function isValidAction(action: any) {
  if (!action.action_type) {
    console.warn("⚠️ Missing action_type:", action.id)
    return false
  }

  const requiresPayload = [
    "refund",
    "notify_customer",
    "expedite_shipping",
    "discount",
  ]

  if (requiresPayload.includes(action.action_type) && !action.payload) {
    console.warn("⚠️ Missing payload:", action.id)
    return false
  }

  return true
}

// -------------------------
// 🔒 LOCK
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
  string,
  (action: any) => Promise<void>
> = {
  refund: handleRefund,
  discount: handleDiscount,
  reship: handleReship,
  notify_customer: handleNotify,
  expedite_shipping: handleExpedite,
}

async function executeAction(action: any) {
  const handler = ACTION_HANDLERS[action.action_type]

  if (!handler) {
    console.log("🤷 Unknown action:", action.action_type)
    return
  }

  return handler(action)
}

// -------------------------
// ✅ SUCCESS
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
// ❌ FAILURE
// -------------------------
async function updateFailure(
  supabase: any,
  action: any,
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

  console.log(
    `🔁 Retry in ${delayMinutes} min (attempt ${retryCount})`
  )
}

// -------------------------
// 🧠 HANDLERS
// -------------------------
async function handleRefund(action: any) {
  const { amount, reason } = action.payload || {}

  console.log("💸 Refund:", {
    order: action.order_id,
    amount,
    reason,
  })

  await fakeDelay()
}

async function handleDiscount(action: any) {
  const { amount } = action.payload || {}

  console.log("🏷️ Discount:", {
    order: action.order_id,
    amount,
  })

  await fakeDelay()
}

async function handleReship(action: any) {
  console.log("📦 Reship:", action.order_id)
  await fakeDelay()
}

async function handleNotify(action: any) {
  const { template } = action.payload || {}

  console.log("📩 Notify:", {
    order: action.order_id,
    template,
  })

  await fakeDelay()
}

async function handleExpedite(action: any) {
  const { priority } = action.payload || {}

  console.log("🚚 Expedite:", {
    order: action.order_id,
    priority,
  })

  await fakeDelay()
}

// -------------------------
// 🧪 MOCK
// -------------------------
function fakeDelay() {
  return new Promise((res) => setTimeout(res, 300))
}
import { createServerClient } from "./supabase-server"

// -------------------------
// ⚙️ CONFIG
// -------------------------
const MAX_RETRIES = 3

// -------------------------
// 🚀 MAIN EXECUTOR
// -------------------------
export async function runActionExecutor() {
  const supabase = createServerClient()

  const now = new Date().toISOString()

  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .or("status.eq.pending,status.eq.failed")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .limit(20)

  if (error) {
    console.error("❌ Failed to fetch actions:", error)
    return
  }

  for (const action of actions || []) {
    // 🚫 Stop if max retries reached
    if (
      action.status === "failed" &&
      (action.retry_count || 0) >= MAX_RETRIES
    ) {
      console.log("🚫 Max retries reached:", action.id)
      continue
    }

    try {
      console.log("⚡ Executing:", action.action_type)

      await executeAction(action)

      // ✅ Success
      await updateSuccess(supabase, action.id)

    } catch (err: any) {
      console.error("❌ Execution failed:", err.message)

      // 🔁 Retry logic
      await updateFailure(supabase, action, err.message)
    }
  }
}

// -------------------------
// 🎯 ACTION ROUTER
// -------------------------
async function executeAction(action: any) {
  switch (action.action_type) {
    case "refund":
      return handleRefund(action)

    case "discount":
      return handleDiscount(action)

    case "reship":
      return handleReship(action)

    case "notify_customer":
      return handleNotify(action)

    case "expedite_shipping":
      return handleExpedite(action)

    default:
      console.log("🤷 Unknown action:", action.action_type)
  }
}

// -------------------------
// ✅ SUCCESS HANDLER
// -------------------------
async function updateSuccess(supabase: any, id: string) {
  await supabase
    .from("actions")
    .update({
      status: "completed",
      last_attempt_at: new Date().toISOString(),
      next_retry_at: null,
    })
    .eq("id", id)
}

// -------------------------
// ❌ FAILURE HANDLER (RETRY)
// -------------------------
async function updateFailure(
  supabase: any,
  action: any,
  errorMessage: string
) {
  const retryCount = (action.retry_count || 0) + 1

  // ⏳ Exponential backoff (minutes)
  const delayMinutes = Math.pow(2, retryCount)

  const nextRetry = new Date(
    Date.now() + delayMinutes * 60 * 1000
  ).toISOString()

  await supabase
    .from("actions")
    .update({
      status: "failed",
      retry_count: retryCount,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: nextRetry,
      metadata: {
        ...(action.metadata || {}),
        last_error: errorMessage,
      },
    })
    .eq("id", action.id)

  console.log(
    `🔁 Retry scheduled in ${delayMinutes} min (attempt ${retryCount})`
  )
}

// -------------------------
// 💰 REFUND (Mock)
// -------------------------
async function handleRefund(action: any) {
  console.log("💸 Refund:", {
    order: action.order_id,
    amount: action.amount,
  })

  await fakeDelay()
}

// -------------------------
// 🎁 DISCOUNT
// -------------------------
async function handleDiscount(action: any) {
  console.log("🏷️ Discount:", {
    order: action.order_id,
    amount: action.amount,
  })

  await fakeDelay()
}

// -------------------------
// 📦 RESHIP
// -------------------------
async function handleReship(action: any) {
  console.log("📦 Reship order:", action.order_id)

  await fakeDelay()
}

// -------------------------
// 📩 NOTIFY CUSTOMER
// -------------------------
async function handleNotify(action: any) {
  console.log("📩 Notify:", action.order_id)

  await fakeDelay()
}

// -------------------------
// 🚚 EXPEDITE SHIPPING
// -------------------------
async function handleExpedite(action: any) {
  console.log("🚚 Expedite:", action.order_id)

  await fakeDelay()
}

// -------------------------
// 🧪 MOCK DELAY
// -------------------------
function fakeDelay() {
  return new Promise((res) => setTimeout(res, 300))
}
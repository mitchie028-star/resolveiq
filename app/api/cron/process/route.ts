import { addWorkflowJob } from "@/lib/queue/producer"

// -------------------------
// 🔐 AUTH GUARD
// -------------------------
function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization")

  // Allow local/dev runs if no secret configured
  if (!process.env.CRON_SECRET) return true

  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

// -------------------------
// 🧠 SAFE QUEUE HELPER
// -------------------------
async function safeAddJob(type: string) {
  try {
    await addWorkflowJob({ type })
    console.log(`📦 Job queued: ${type}`)
  } catch (err: any) {
    console.error(`❌ Failed to queue ${type}:`, err?.message || err)
    throw err
  }
}

// -------------------------
// 🚀 CRON ENTRYPOINT (DISPATCHER ONLY)
// -------------------------
export async function GET(req: Request) {
  const start = Date.now()

  console.log("⚡ Cron dispatcher triggered")

  try {
    // 🔐 AUTH CHECK
    if (!isAuthorized(req)) {
      console.warn("🚫 Unauthorized cron request blocked")
      return new Response("Unauthorized", { status: 401 })
    }

    // ⚙️ STEP 1: Alert Engine
    await safeAddJob("RUN_ALERT_ENGINE")

    // 🧠 STEP 2: Decision Engine
    await safeAddJob("RUN_DECISION_ENGINE")

    // 🚀 STEP 3: Action Executor
    await safeAddJob("RUN_ACTION_EXECUTOR")

    const duration = Date.now() - start

    console.log(`✅ Cron dispatch complete in ${duration}ms`)

    return Response.json({
      success: true,
      duration,
      message: "Workflow jobs successfully queued",
    })
  } catch (err: any) {
    const duration = Date.now() - start

    console.error("💥 Cron dispatcher failed:", err)

    return Response.json(
      {
        success: false,
        duration,
        error: err?.message || "cron_dispatch_failed",
      },
      { status: 500 }
    )
  }
}
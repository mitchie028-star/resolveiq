import { addWorkflowJob } from "@/lib/queue/producer"
import { WorkflowJobType } from "@/lib/queue/types"

// -------------------------
// 🔐 AUTH GUARD
// -------------------------
function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization")

  // If no secret set, allow (useful for local dev)
  if (!process.env.CRON_SECRET) return true

  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

// -------------------------
// 🚀 CRON ENTRYPOINT (JOB DISPATCHER ONLY)
// -------------------------
export async function GET(req: Request) {
  const start = Date.now()

  console.log("⚡ Cron dispatcher started")

  try {
    // 🔐 Security check
    if (!isAuthorized(req)) {
      console.warn("🚫 Unauthorized cron request blocked")
      return new Response("Unauthorized", { status: 401 })
    }

    // 🧠 Enqueue jobs with typed types
    await safeAddJob("RUN_ALERT_ENGINE")
    await safeAddJob("RUN_DECISION_ENGINE")
    await safeAddJob("RUN_ACTION_EXECUTOR")

    const duration = Date.now() - start

    console.log(`✅ Cron jobs enqueued successfully (${duration}ms)`)

    return Response.json({
      success: true,
      duration,
      message: "Workflow jobs queued successfully",
    })
  } catch (err: any) {
    console.error("❌ Cron dispatcher failed:", err)

    return Response.json(
      {
        success: false,
        error: err?.message || "cron_dispatch_failed",
      },
      { status: 500 }
    )
  }
}

// -------------------------
// 📦 SAFELY ADD JOB WITH TYPED `type`
// -------------------------
async function safeAddJob(type: WorkflowJobType) {
  try {
    await addWorkflowJob({ type })
    console.log(`📦 Job queued: ${type}`)
  } catch (err: any) {
    console.error(`❌ Failed to queue ${type}:`, err?.message || err)
  }
}
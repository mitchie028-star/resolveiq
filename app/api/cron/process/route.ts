import { runAlertEngine } from "@/lib/alert-engine"
import { runDecisionEngine } from "@/lib/decision-engine"

// -------------------------
// 🧠 STAGE RUNNER (STRICT)
// -------------------------
async function runStage(
  label: string,
  fn: () => Promise<void>
) {
  const start = Date.now()

  try {
    console.log(`▶️ ${label} started`)
    await fn()
    const duration = Date.now() - start
    console.log(`✅ ${label} finished (${duration}ms)`)

    return { success: true, duration }
  } catch (err) {
    const duration = Date.now() - start
    console.error(`❌ ${label} failed (${duration}ms):`, err)

    return { success: false, duration, error: err }
  }
}

// -------------------------
// 🚀 CRON ENTRYPOINT
// -------------------------
export async function GET(req: Request) {
  // -------------------------
  // 🔒 AUTH (CRON PROTECTION)
  // -------------------------
  const authHeader = req.headers.get("authorization")

  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  const start = Date.now()
  console.log("⚡ Cron started")

  try {
    // -------------------------
    // 🧠 ALERT ENGINE (REQUIRED)
    // -------------------------
    const alertResult = await runStage(
      "Alert Engine",
      runAlertEngine
    )

    if (!alertResult.success) {
      console.log("⛔ Stopping pipeline (alert failed)")

      return Response.json({
        success: false,
        stage: "alert_engine_failed",
      })
    }

    // -------------------------
    // 🧠 DECISION ENGINE (DEPENDENT)
    // -------------------------
    const decisionResult = await runStage(
      "Decision Engine",
      runDecisionEngine
    )

    if (!decisionResult.success) {
      console.log("⛔ Skipping executor (decision failed)")

      return Response.json({
        success: false,
        stage: "decision_engine_failed",
      })
    }

    // -------------------------
    // ⚙️ ACTION EXECUTOR
    // -------------------------
    const executorResult = await runStage(
      "Action Executor",
      async () => {
        const baseUrl =
          process.env.BASE_URL ||
          `http://localhost:${process.env.PORT || 3000}`

        const res = await fetch(
          `${baseUrl}/api/actions/process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.CRON_SECRET
                ? {
                    Authorization: `Bearer ${process.env.CRON_SECRET}`,
                  }
                : {}),
            },
          }
        )

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Executor failed: ${text}`)
        }
      }
    )

    const totalDuration = Date.now() - start

    console.log(`✅ Cron finished in ${totalDuration}ms`)

    return Response.json({
      success: true,
      duration: totalDuration,
      stages: {
        alert: alertResult,
        decision: decisionResult,
        executor: executorResult,
      },
    })
  } catch (err) {
    console.error("❌ Cron crashed:", err)

    return new Response("Error", { status: 500 })
  }
}
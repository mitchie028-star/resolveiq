import { runAlertEngine } from "@/lib/alert-engine"
import { runDecisionEngine } from "@/lib/decision-engine"

// -------------------------
// 🧠 STAGE RUNNER (SAFE)
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
  } catch (err: any) {
    const duration = Date.now() - start

    console.error(`❌ ${label} failed (${duration}ms):`, err)

    return {
      success: false,
      duration,
      error: {
        message: err?.message || "unknown_error",
        stack: err?.stack || null,
      },
    }
  }
}

// -------------------------
// 🔧 EXECUTOR CALL
// -------------------------
async function runExecutor() {
  const baseUrl =
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`

  const url = `${baseUrl}/api/actions/execute` // ✅ FIXED

  console.log("⚙️ Calling executor:", url)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, {
      method: "POST", // ✅ IMPORTANT
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CRON_SECRET
          ? {
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
            }
          : {}),
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const raw = await res.text()

    let parsed: any = raw
    try {
      parsed = JSON.parse(raw)
    } catch {
      // leave as text if not JSON
    }

    if (!res.ok) {
      console.error("❌ Executor raw response:", raw)
      throw new Error(
        `Executor failed (${res.status}): ${JSON.stringify(parsed)}`
      )
    }

    console.log("⚙️ Executor response:", parsed)
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Executor request timed out")
    }

    throw err
  }
}

// -------------------------
// 🚀 CRON ENTRYPOINT
// -------------------------
export async function GET(req: Request) {
  // -------------------------
  // 🔒 AUTH
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
    // 🧠 ALERT ENGINE
    // -------------------------
    const alertResult = await runStage(
      "Alert Engine",
      runAlertEngine
    )

    if (!alertResult.success) {
      console.log("⛔ Stopping pipeline (alert failed)")

      return Response.json({
        success: false,
        stage: "alert_failed",
        stages: {
          alert: alertResult,
        },
      })
    }

    // -------------------------
    // 🧠 DECISION ENGINE
    // -------------------------
    const decisionResult = await runStage(
      "Decision Engine",
      runDecisionEngine
    )

    if (!decisionResult.success) {
      console.log("⛔ Skipping executor (decision failed)")

      return Response.json({
        success: false,
        stage: "decision_failed",
        stages: {
          alert: alertResult,
          decision: decisionResult,
        },
      })
    }

    // -------------------------
    // ⚙️ EXECUTOR
    // -------------------------
    const executorResult = await runStage(
      "Action Executor",
      runExecutor
    )

    const totalDuration = Date.now() - start

    console.log(`✅ Cron finished in ${totalDuration}ms`)

    return Response.json({
      success: executorResult.success,
      duration: totalDuration,
      stages: {
        alert: alertResult,
        decision: decisionResult,
        executor: executorResult,
      },
    })
  } catch (err: any) {
    console.error("❌ Cron crashed:", err)

    return Response.json(
      {
        success: false,
        error: err?.message || "cron_crash",
      },
      { status: 500 }
    )
  }
}
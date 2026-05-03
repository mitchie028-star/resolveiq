import { runAlertEngine } from "@/lib/alert-engine"
import { runDecisionEngine } from "@/lib/decision-engine"

// -------------------------
// 🧠 STAGE RUNNER (GENERIC + SAFE)
// -------------------------
async function runStage<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{
  success: boolean
  duration: number
  result?: T
  error?: {
    message: string
    stack?: string | null
  }
}> {
  const start = Date.now()

  try {
    console.log(`▶️ ${label} started`)

    const result = await fn()

    const duration = Date.now() - start
    console.log(`✅ ${label} finished (${duration}ms)`)

    return {
      success: true,
      duration,
      result,
    }
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
// ⚙️ EXECUTOR CALL
// -------------------------
async function runExecutor() {
  console.log("⚙️ Calling executor: /api/actions/execute")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch("/api/actions/execute", {
      method: "POST",
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

    let parsed: unknown = raw
    try {
      parsed = JSON.parse(raw)
    } catch {
      // leave as raw string
    }

    if (!res.ok) {
      console.error("❌ Executor raw response:", raw)
      throw new Error(
        `Executor failed (${res.status}): ${JSON.stringify(parsed)}`
      )
    }

    console.log("⚙️ Executor response:", parsed)

    return parsed
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Executor timeout")
    }

    throw err
  }
}

// -------------------------
// 🚀 CRON ENTRYPOINT
// -------------------------
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")

  // 🔐 Protect cron endpoint
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  const start = Date.now()
  console.log("⚡ Cron started")

  try {
    // 🧠 ALERT
    const alert = await runStage("Alert Engine", async () => {
      return await runAlertEngine()
    })

    if (!alert.success) {
      return Response.json({
        success: false,
        stage: "alert_failed",
        stages: { alert },
      })
    }

    // 🧠 DECISION
    const decision = await runStage("Decision Engine", async () => {
      return await runDecisionEngine()
    })

    if (!decision.success) {
      return Response.json({
        success: false,
        stage: "decision_failed",
        stages: { alert, decision },
      })
    }

    // ⚙️ EXECUTOR
    const executor = await runStage("Executor", async () => {
      return await runExecutor()
    })

    const totalDuration = Date.now() - start
    console.log(`✅ Cron finished in ${totalDuration}ms`)

    return Response.json({
      success: executor.success,
      duration: totalDuration,
      stages: {
        alert,
        decision,
        executor,
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
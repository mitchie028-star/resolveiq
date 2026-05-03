import { runAlertEngine } from "@/lib/alert-engine"
import { runDecisionEngine } from "@/lib/decision-engine"

async function runStage(label: string, fn: () => Promise<void>) {
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
      },
    }
  }
}

async function runExecutor(req: Request) {
  const origin = new URL(req.url).origin
  const url = `${origin}/api/actions/execute`

  console.log("⚙️ Calling executor:", url)

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CRON_SECRET
        ? {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          }
        : {}),
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Executor failed: ${text}`)
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")

  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  console.log("⚡ Cron started")

  const alert = await runStage("Alert Engine", runAlertEngine)

  if (!alert.success) {
    return Response.json({ success: false, stage: "alert_failed" })
  }

  const decision = await runStage(
    "Decision Engine",
    runDecisionEngine
  )

  if (!decision.success) {
    return Response.json({
      success: false,
      stage: "decision_failed",
    })
  }

  const executor = await runStage("Executor", () =>
    runExecutor(req)
  )

  return Response.json({
    success: executor.success,
    stages: { alert, decision, executor },
  })
}
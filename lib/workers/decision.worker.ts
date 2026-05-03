import { Worker } from "bullmq"
import { connection } from "@/lib/queue/connection"
import { runDecisionEngine } from "@/lib/decision-engine"

// -------------------------
// 🧠 WORKER: DECISION ENGINE
// -------------------------
export const decisionWorker = new Worker(
  "workflow",
  async (job) => {
    if (job.name !== "RUN_DECISION_ENGINE") return

    console.log("🧠 Decision Worker started")

    try {
      const result = await runDecisionEngine()

      console.log("✅ Decision Worker finished:", result)

      return result
    } catch (err: any) {
      console.error("❌ Decision Worker failed:", err)
      throw err
    }
  },
  {
    connection,
    concurrency: 2,
  }
)

// -------------------------
// 🔥 GLOBAL LOGGING
// -------------------------
decisionWorker.on("completed", (job, result) => {
  console.log(`🎯 Job completed: ${job.id}`, result)
})

decisionWorker.on("failed", (job, err) => {
  console.error(`💥 Job failed: ${job?.id}`, err)
})
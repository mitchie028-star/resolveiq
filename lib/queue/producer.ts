import { workflowQueue } from "./connection"
import { WorkflowJob, WorkflowJobType } from "./types"

// -------------------------
// 📦 WORKFLOW PRODUCER (SAFE + TYPED)
// -------------------------
export async function addWorkflowJob(job: WorkflowJob) {
  return workflowQueue.add(job.type, job, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  })
}

// -------------------------
// 🧠 OPTIONAL: TYPE-SAFE HELPERS (CLEANER CALLS)
// -------------------------
export async function enqueueWorkflowJob(type: WorkflowJobType) {
  return workflowQueue.add(type, { type }, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  })
}
import { workflowQueue } from "./connection"
import { WorkflowJob } from "./types"

export async function addWorkflowJob(job: WorkflowJob) {
  return workflowQueue.add(job.type, job, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  })
}
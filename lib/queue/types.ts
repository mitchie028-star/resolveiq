// -------------------------
// 🚀 WORKFLOW JOB TYPES (SINGLE SOURCE OF TRUTH)
// -------------------------

export const WORKFLOW_JOB_TYPES = {
  RUN_ALERT_ENGINE: "RUN_ALERT_ENGINE",
  RUN_DECISION_ENGINE: "RUN_DECISION_ENGINE",
  RUN_ACTION_EXECUTOR: "RUN_ACTION_EXECUTOR",
} as const

export type WorkflowJobType =
  (typeof WORKFLOW_JOB_TYPES)[keyof typeof WORKFLOW_JOB_TYPES]

// -------------------------
// 📦 BASE JOB STRUCTURE
// -------------------------
export type BaseWorkflowJob<T extends WorkflowJobType> = {
  type: T
  payload?: unknown
}

// -------------------------
// 🧠 SPECIFIC JOBS (TYPE-SAFE + EXTENSIBLE)
// -------------------------
export type WorkflowJob =
  | BaseWorkflowJob<typeof WORKFLOW_JOB_TYPES.RUN_ALERT_ENGINE>
  | BaseWorkflowJob<typeof WORKFLOW_JOB_TYPES.RUN_DECISION_ENGINE>
  | BaseWorkflowJob<typeof WORKFLOW_JOB_TYPES.RUN_ACTION_EXECUTOR>
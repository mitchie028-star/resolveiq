export type WorkflowJob =
  | {
      type: "RUN_ALERT_ENGINE"
    }
  | {
      type: "RUN_DECISION_ENGINE"
    }
  | {
      type: "RUN_ACTION_EXECUTOR"
    }
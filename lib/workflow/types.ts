// -------------------------
// 🧠 CORE ENTITIES
// -------------------------

export type AlertStatus = "active" | "resolved"

export type WorkflowState =
  | "new"
  | "notified"
  | "expedited"
  | "recovered"

export type ActionStatus =
  | "pending"
  | "in_progress"
  | "failed"
  | "completed"

// -------------------------
// ⚠️ ALERT ENTITY
// -------------------------
export type Alert = {
  id: string
  order_id: string
  merchant_id: string
  alert_type: string
  severity: "low" | "medium" | "high" | "critical"
  risk_score: number

  status: AlertStatus

  workflow_state: WorkflowState
  workflow_step: number
  last_action_at: string | null
}

// -------------------------
// 🎯 ACTION TYPES
// -------------------------
export type ActionType =
  | "notify_customer"
  | "expedite_shipping"
  | "refund"
  | "discount"
  | "reship"

// -------------------------
// ⚙️ ACTION ENTITY
// -------------------------
export type ActionRecord = {
  id: string
  alert_id: string
  order_id: string
  merchant_id: string

  action_type: ActionType
  status: ActionStatus

  payload?: Record<string, any>
  metadata?: {
    score?: number
    reason?: string
    last_error?: string
  }

  priority?: "low" | "medium" | "high"

  retry_count?: number
  next_retry_at?: string | null

  created_at?: string
  updated_at?: string
  executed_at?: string | null
}

// -------------------------
// 🧠 DECISION OUTPUT
// -------------------------
export type ActionDecision = {
  type: ActionType
  priority: "low" | "medium" | "high"
  score: number
  reason: string
}

// -------------------------
// 🚀 ENGINE RESULTS
// -------------------------
export type DecisionEngineResult = {
  success: boolean
  processed: number
  errors: number
}

export type ActionExecutorResult = {
  success: boolean
  processed: string[]
  errors: string[]
}
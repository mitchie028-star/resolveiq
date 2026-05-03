import { Queue } from "bullmq"
import { redis } from "./redis"

// -------------------------
// 🧠 QUEUE NAMES (SOURCE OF TRUTH)
// -------------------------
export const QUEUE_NAMES = {
  alerts: "alerts-queue",
  decisions: "decisions-queue",
  actions: "actions-queue",
}

// -------------------------
// ⚙️ QUEUES (NOT USED YET - SAFE SETUP)
// -------------------------
export const alertQueue = new Queue(QUEUE_NAMES.alerts, {
  connection: redis,
})

export const decisionQueue = new Queue(QUEUE_NAMES.decisions, {
  connection: redis,
})

export const actionQueue = new Queue(QUEUE_NAMES.actions, {
  connection: redis,
})
import { Queue, Worker } from "bullmq"
import IORedis from "ioredis"

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
})

export const workflowQueue = new Queue("workflow", {
  connection,
})
import { createServerClient } from "./supabase-server"

// -------------------------
// 🎭 DEMO MODE SWITCH
// -------------------------
const DEMO_MODE = true

// -------------------------
// 🎭 DEMO DATA GENERATOR
// -------------------------
function getDemoData() {
  const now = new Date()

  const minutesAgo = (m: number) =>
    new Date(now.getTime() - m * 60 * 1000).toISOString()

  return {
    // -------------------------
    // 📦 CORE
    // -------------------------
    orders: 1284,
    activeAlerts: 3,
    resolvedAlerts: 42,
    messages: 96,

    // -------------------------
    // 🧠 METRICS
    // -------------------------
    resolutionRate: 93,
    automationRate: 81,
    avgResolutionHours: 2,
    messagesPerAlert: 2.3,
    highSeverityRatio: 18,

    // -------------------------
    // 💰 FINANCIALS
    // -------------------------
    estimatedSavings: 105,
    refundAmount: 184.5,

    // -------------------------
    // 🚨 ALERTS (STORY-DRIVEN)
    // -------------------------
    alertsList: [
      {
        id: "1",
        alert_type: "delay",
        message: "Order delayed beyond SLA (3 days)",
        severity: "high",
        status: "active",
      },
      {
        id: "2",
        alert_type: "lost_package",
        message: "Carrier marked package as lost",
        severity: "critical",
        status: "active",
      },
      {
        id: "3",
        alert_type: "delivery_risk",
        message: "High likelihood of failed delivery",
        severity: "medium",
        status: "active",
      },
    ],

    resolvedList: [
      {
        id: "4",
        alert_type: "delay",
        message: "Customer proactively notified",
        severity: "medium",
        status: "resolved",
      },
      {
        id: "5",
        alert_type: "refund_risk",
        message: "Refund issued before complaint",
        severity: "high",
        status: "resolved",
      },
    ],

    // -------------------------
    // ⚡ ACTIONS
    // -------------------------
    pendingActions: 2,
    failedActions: 1,
    completedActions: 24,

    actionsList: [
      {
        id: "a1",
        action_type: "refund",
        order_id: "#1001",
        status: "completed",
        retry_count: 0,
        last_attempt_at: minutesAgo(0), // just now
        metadata: { amount: 45.5 },
      },
      {
        id: "a2",
        action_type: "reship",
        order_id: "#1002",
        status: "pending",
        retry_count: 1,
        last_attempt_at: minutesAgo(1),
      },
      {
        id: "a3",
        action_type: "notify_customer",
        order_id: "#1003",
        status: "completed",
        retry_count: 0,
        last_attempt_at: minutesAgo(2),
      },
      {
        id: "a4",
        action_type: "discount",
        order_id: "#1004",
        status: "failed",
        retry_count: 2,
        last_attempt_at: minutesAgo(5),
      },
      {
        id: "a5",
        action_type: "expedite_shipping",
        order_id: "#1005",
        status: "completed",
        retry_count: 0,
        last_attempt_at: minutesAgo(3),
      },
    ],
  }
}

// -------------------------
// 🚀 MAIN FUNCTION
// -------------------------
export async function getDashboardData() {
  // 🎭 DEMO MODE SHORT-CIRCUIT
  if (DEMO_MODE) {
    return getDemoData()
  }

  const supabase = createServerClient()

  const [
    ordersRes,
    activeAlertsRes,
    resolvedAlertsRes,
    messagesRes,
    alertsListRes,
    resolvedListRes,
    resolutionTimeRes,
    highSeverityRes,
    pendingActionsRes,
    failedActionsRes,
    completedActionsRes,
    actionsListRes,
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),

    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved"),

    supabase.from("messages").select("*", { count: "exact", head: true }),

    supabase
      .from("alerts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("alerts")
      .select("*")
      .eq("status", "resolved")
      .order("updated_at", { ascending: false })
      .limit(5),

    supabase
      .from("alerts")
      .select("created_at, resolved_at")
      .eq("status", "resolved"),

    supabase.from("alerts").select("severity"),

    supabase
      .from("actions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("actions")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),

    supabase
      .from("actions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),

    supabase
      .from("actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  // -------------------------
  // 🔒 SAFE COUNTS
  // -------------------------
  const orders = ordersRes.count ?? 0
  const active = activeAlertsRes.count ?? 0
  const resolved = resolvedAlertsRes.count ?? 0
  const totalAlerts = active + resolved
  const messages = messagesRes.count ?? 0

  const actionsList = actionsListRes.data ?? []

  // -------------------------
  // 🧠 METRICS
  // -------------------------
  const resolutionRate =
    totalAlerts === 0
      ? 0
      : Math.round((resolved / totalAlerts) * 100)

  let avgResolutionHours = 0

  const times =
    resolutionTimeRes.data
      ?.map((a: any) => {
        if (!a?.created_at || !a?.resolved_at) return null

        const created = new Date(a.created_at).getTime()
        const resolved = new Date(a.resolved_at).getTime()

        if (isNaN(created) || isNaN(resolved)) return null

        return (resolved - created) / (1000 * 60 * 60)
      })
      .filter((t: number | null): t is number => t !== null) ?? []

  if (times.length > 0) {
    const total = times.reduce((sum, t) => sum + t, 0)
    avgResolutionHours = Math.round(total / times.length)
  }

  const messagesPerAlert =
    totalAlerts === 0 ? 0 : messages / totalAlerts

  const highSeverityCount =
    highSeverityRes.data?.filter((a: any) =>
      ["high", "critical"].includes(a?.severity)
    ).length ?? 0

  const highSeverityRatio =
    totalAlerts === 0
      ? 0
      : Math.round((highSeverityCount / totalAlerts) * 100)

  // -------------------------
  // ⚡ ACTION METRICS
  // -------------------------
  const pendingActions = pendingActionsRes.count ?? 0
  const failedActions = failedActionsRes.count ?? 0
  const completedActions = completedActionsRes.count ?? 0

  const automationRate =
    totalAlerts === 0
      ? 0
      : Math.round((completedActions / totalAlerts) * 100)

  // -------------------------
  // 💰 FINANCIAL IMPACT
  // -------------------------
  let refundAmount = 0
  let estimatedSavings = 0

  for (const action of actionsList) {
    const metadata = action?.metadata || {}

    if (action?.action_type === "refund" && metadata?.amount) {
      refundAmount += Number(metadata.amount)
    }

    if (action?.status === "completed") {
      estimatedSavings += 2.5
    }
  }

  estimatedSavings = Math.round(estimatedSavings)
  refundAmount = Number(refundAmount.toFixed(2))

  // -------------------------
  // 📦 RETURN
  // -------------------------
  return {
    orders,
    activeAlerts: active,
    resolvedAlerts: resolved,
    messages,

    resolutionRate,
    automationRate,
    avgResolutionHours,
    messagesPerAlert: Number(messagesPerAlert.toFixed(2)),
    highSeverityRatio,

    estimatedSavings,
    refundAmount,

    alertsList: alertsListRes.data ?? [],
    resolvedList: resolvedListRes.data ?? [],

    pendingActions,
    failedActions,
    completedActions,
    actionsList,
  }
}
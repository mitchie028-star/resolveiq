import { createServerClient } from "./supabase-server"
import { computeDashboardMetrics } from "./core/dashboard-metrics"

// -------------------------
// ⚙️ CONFIG
// -------------------------
const DEMO_MODE = process.env.DEMO_MODE === "true"

// -------------------------
// 🧬 TIMELINE
// -------------------------
function buildTimeline(actions: any[], alerts: any[]) {
  const alertMap = new Map(alerts.map((a) => [a.id, a]))

  return actions.map((a) => {
    const alert = alertMap.get(a.alert_id)

    return {
      id: a.id,
      orderId: a.order_id,

      step: a.action_type,
      status: a.status,
      createdAt: a.created_at,

      reason: a.metadata?.reason ?? "",
      score: a.metadata?.score ?? 0,

      state: alert?.workflow_state ?? "new",
      outcome: alert?.outcome ?? null,
    }
  })
}

// -------------------------
// 💰 IMPACT
// -------------------------
function computeImpact(alerts: any[], actions: any[]) {
  const resolved = alerts.filter((a) => a.status === "resolved")

  const successful = actions.filter(
    (a) => a.result?.success === true
  )

  const refunded = successful.filter(
    (a) => a.action_type === "refund"
  ).length

  const prevented = Math.max(successful.length - refunded, 0)

  return {
    prevented,
    refunded,
    estimatedSavings: Math.round(prevented * 3),
  }
}

// -------------------------
// 🔄 NORMALIZE ACTIONS
// -------------------------
function normalizeActions(raw: any[]) {
  return raw.map((a) => ({
    id: a.id,
    type: a.action_type,
    orderId: a.order_id,

    status: a.status,
    retryCount: a.retry_count ?? 0,
    lastAttempt: a.last_attempt_at ?? a.created_at,

    reason: a.metadata?.reason ?? "",
    score: a.metadata?.score ?? 0,

    payload: a.payload ?? {},

    success:
      a.result?.success === true
        ? true
        : a.result?.success === false
        ? false
        : null,

    error: a.result?.error ?? null,
  }))
}

// -------------------------
// 🧪 DEMO DATA
// -------------------------
function getDemoData() {
  const now = new Date().toISOString()

  const alerts = [
    {
      id: "a1",
      order_id: "ORD-1001",
      message: "Order delayed (92 risk)",
      severity: "critical",
      status: "active",
      workflow_state: "recovering",
    },
    {
      id: "a2",
      order_id: "ORD-1002",
      message: "Shipment stuck (78 risk)",
      severity: "high",
      status: "active",
      workflow_state: "recovering",
    },
    {
      id: "a3",
      order_id: "ORD-1003",
      message: "Carrier delay (65 risk)",
      severity: "medium",
      status: "resolved",
      workflow_state: "recovered",
      outcome: "recovered",
    },
  ]

  const rawActions = [
    {
      id: "act1",
      alert_id: "a1",
      action_type: "refund",
      order_id: "ORD-1001",
      status: "completed",
      metadata: { reason: "Critical delay", score: 95 },
      result: { success: true },
      created_at: now,
    },
    {
      id: "act2",
      alert_id: "a2",
      action_type: "expedite_shipping",
      order_id: "ORD-1002",
      status: "completed",
      metadata: { reason: "High delay", score: 85 },
      result: { success: true },
      created_at: now,
    },
  ]

  const actionsList = normalizeActions(rawActions)

  return {
    orders: 120,
    activeAlerts: 2,
    resolvedAlerts: 1,
    messages: 45,

    avgResolutionHours: 2.1,
    completedActions: 2,
    failedActions: 0,
    automationRate: 92,

    alertsList: alerts.filter((a) => a.status === "active"),
    resolvedList: alerts.filter((a) => a.status === "resolved"),

    actionsList,

    timeline: buildTimeline(rawActions, alerts),
    impact: computeImpact(alerts, rawActions),

    story:
      "ResolvedIQ prevented delivery issues before customers complained.",
  }
}

// -------------------------
// 🚀 MAIN
// -------------------------
export async function getDashboardData() {
  if (DEMO_MODE) return getDemoData()

  const supabase = createServerClient()

  const [
    ordersRes,
    activeRes,
    resolvedRes,
    messagesRes,
    alertsRes,
    resolvedListRes,
    resolutionRes,
    severityRes,
    actionsRes,
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
      .select(`
        id,
        alert_id,
        action_type,
        order_id,
        status,
        retry_count,
        last_attempt_at,
        payload,
        metadata,
        result,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  // -------------------------
  // COUNTS
  // -------------------------
  const orders = ordersRes.count ?? 0
  const active = activeRes.count ?? 0
  const resolved = resolvedRes.count ?? 0
  const messages = messagesRes.count ?? 0

  const alerts = alertsRes.data ?? []
  const resolvedList = resolvedListRes.data ?? []
  const allAlerts = [...alerts, ...resolvedList]

  const rawActions = actionsRes.data ?? []
  const actionsList = normalizeActions(rawActions)

  // -------------------------
  // TIMELINE + IMPACT
  // -------------------------
  const timeline = buildTimeline(rawActions, allAlerts)
  const impact = computeImpact(allAlerts, rawActions)

  // -------------------------
  // METRICS
  // -------------------------
  const resolutionTimes =
    (resolutionRes.data ?? [])
      .map((a: any) => {
        if (!a.created_at || !a.resolved_at) return null
        return (
          (new Date(a.resolved_at).getTime() -
            new Date(a.created_at).getTime()) /
          (1000 * 60 * 60)
        )
      })
      .filter(Boolean) ?? []

  const severities =
    severityRes.data?.map((a: any) => a.severity) ?? []

  const metrics = computeDashboardMetrics({
    active,
    resolved,
    messages,
    resolutionTimes,
    severities,
    actions: rawActions,
  })

  // -------------------------
  // STORY
  // -------------------------
  const story =
    resolved > 0
      ? `ResolvedIQ handled ${metrics.automationRate}% of issues automatically.`
      : "System monitoring active. No risks detected."

  // -------------------------
  // RETURN
  // -------------------------
  return {
    orders,
    activeAlerts: active,
    resolvedAlerts: resolved,
    messages,

    ...metrics,

    story,
    timeline,
    impact,

    alertsList: alerts,
    resolvedList,

    actionsList,
  }
}
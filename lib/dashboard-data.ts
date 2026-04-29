import { createServerClient } from "./supabase-server"

export async function getDashboardData() {
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
  ] = await Promise.all([
    // Orders
    supabase.from("orders").select("*", { count: "exact", head: true }),

    // Active alerts
    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),

    // Resolved alerts
    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved"),

    // Messages
    supabase.from("messages").select("*", { count: "exact", head: true }),

    // Active alerts list
    supabase
      .from("alerts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),

    // Resolved alerts list
    supabase
      .from("alerts")
      .select("*")
      .eq("status", "resolved")
      .order("updated_at", { ascending: false })
      .limit(5),

    // For avg resolution time
    supabase
      .from("alerts")
      .select("created_at, resolved_at")
      .eq("status", "resolved"),

    // For alert quality
    supabase
      .from("alerts")
      .select("severity")
  ])

  const active = activeAlertsRes.count ?? 0
  const resolved = resolvedAlertsRes.count ?? 0
  const totalAlerts = active + resolved
  const messages = messagesRes.count ?? 0

  // -------------------------
  // 🧠 Metrics
  // -------------------------

  // Resolution rate
  const resolutionRate =
    totalAlerts === 0
      ? 0
      : Math.round((resolved / totalAlerts) * 100)

  // Avg resolution time
  let avgResolutionHours = 0
  if (resolutionTimeRes.data?.length) {
    const times = resolutionTimeRes.data
      .map((a: any) => {
        if (!a.resolved_at) return null
        return (
          new Date(a.resolved_at).getTime() -
          new Date(a.created_at).getTime()
        ) / (1000 * 60 * 60)
      })
      .filter(Boolean)

    if (times.length > 0) {
      avgResolutionHours = Math.round(
        times.reduce((a: number, b: number) => a + b, 0) / times.length
      )
    }
  }

  // Message efficiency
  const messagesPerAlert =
    totalAlerts === 0 ? 0 : messages / totalAlerts

  // Alert quality
  const highSeverityCount =
    highSeverityRes.data?.filter((a: any) =>
      ["high", "critical"].includes(a.severity)
    ).length ?? 0

  const highSeverityRatio =
    totalAlerts === 0
      ? 0
      : Math.round((highSeverityCount / totalAlerts) * 100)

  return {
    orders: ordersRes.count ?? 0,
    activeAlerts: active,
    resolvedAlerts: resolved,
    messages,

    resolutionRate,
    avgResolutionHours,
    messagesPerAlert: Number(messagesPerAlert.toFixed(2)),
    highSeverityRatio,

    alertsList: alertsListRes.data ?? [],
    resolvedList: resolvedListRes.data ?? [],
  }
}
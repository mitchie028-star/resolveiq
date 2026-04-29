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
    supabase.from("alerts").select("severity"),
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

  // Avg resolution time (SAFE)
  let avgResolutionHours = 0

  const times =
    resolutionTimeRes.data
      ?.map((a: any) => {
        if (!a?.created_at || !a?.resolved_at) return null

        const created = new Date(a.created_at).getTime()
        const resolved = new Date(a.resolved_at).getTime()

        // Guard against invalid dates
        if (isNaN(created) || isNaN(resolved)) return null

        return (resolved - created) / (1000 * 60 * 60)
      })
      .filter((t: number | null): t is number => t !== null) ?? []

  if (times.length > 0) {
    const total = times.reduce((sum, t) => sum + t, 0)
    avgResolutionHours = Math.round(total / times.length)
  }

  // Message efficiency
  const messagesPerAlert =
    totalAlerts === 0 ? 0 : messages / totalAlerts

  // Alert quality (SAFE)
  const highSeverityCount =
    highSeverityRes.data?.filter((a: any) =>
      ["high", "critical"].includes(a?.severity)
    ).length ?? 0

  const highSeverityRatio =
    totalAlerts === 0
      ? 0
      : Math.round((highSeverityCount / totalAlerts) * 100)

  // -------------------------
  // 📦 Return
  // -------------------------

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
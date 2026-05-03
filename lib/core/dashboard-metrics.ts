export function computeDashboardMetrics({
  active,
  resolved,
  messages,
  resolutionTimes,
  severities,
  actions,
}: any) {
  const totalAlerts = active + resolved

  const resolutionRate =
    totalAlerts === 0 ? 0 : Math.round((resolved / totalAlerts) * 100)

  const avgResolutionHours =
    resolutionTimes.length === 0
      ? 0
      : Math.round(
          resolutionTimes.reduce((sum: number, t: number) => sum + t, 0) /
            resolutionTimes.length
        )

  const messagesPerAlert =
    totalAlerts === 0 ? 0 : messages / totalAlerts

  const highSeverityCount = severities.filter((s: string) =>
    ["high", "critical"].includes(s)
  ).length

  const highSeverityRatio =
    totalAlerts === 0
      ? 0
      : Math.round((highSeverityCount / totalAlerts) * 100)

  const pendingActions = actions.filter((a: any) => a.status === "pending").length
  const failedActions = actions.filter((a: any) => a.status === "failed").length
  const completedActions = actions.filter((a: any) => a.status === "completed").length

  const automationRate =
    totalAlerts === 0
      ? 0
      : Math.round((completedActions / totalAlerts) * 100)

  let refundAmount = 0
  let estimatedSavings = 0

  for (const action of actions) {
    const metadata = action?.metadata || {}

    if (action.action_type === "refund" && metadata?.amount) {
      refundAmount += Number(metadata.amount)
    }

    if (action.status === "completed") {
      estimatedSavings += 2.5
    }
  }

  return {
    resolutionRate,
    avgResolutionHours,
    messagesPerAlert: Number(messagesPerAlert.toFixed(2)),
    highSeverityRatio,
    automationRate,
    pendingActions,
    failedActions,
    completedActions,
    estimatedSavings: Math.round(estimatedSavings),
    refundAmount: Number(refundAmount.toFixed(2)),
  }
}
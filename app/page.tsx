import { getDashboardData } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const data = await getDashboardData()

  const alerts = data.alertsList ?? []
  const timeline = data.timeline ?? []

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* =============================
          TOP BAR
      ============================= */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600">
          <span className="text-green-600 font-medium">● Live</span>{" "}
          Monitoring {data.orders} orders
        </div>

        <div className="text-sm font-medium">
          ${data.impact?.estimatedSavings ?? 0} saved
        </div>
      </div>

      {/* =============================
          HERO: ACTION REQUIRED
      ============================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Action Required
          </h1>

          {alerts.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
              {alerts.length} urgent
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="text-sm text-neutral-500 border rounded-xl p-4">
            No active risks detected.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a: any) => (
              <div
                key={a.id}
                className="border rounded-xl p-4 flex justify-between gap-4 hover:shadow-sm transition"
              >
                {/* LEFT */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.order_id}</span>
                    <SeverityBadge severity={a.severity} />
                  </div>

                  <div className="text-sm text-neutral-600">
                    {a.message}
                  </div>

                  {a.signals?.length > 0 && (
                    <div className="text-xs text-neutral-500">
                      {a.signals.join(" • ")}
                    </div>
                  )}
                </div>

                {/* RIGHT CTA */}
                <div className="flex items-center">
                  <button className="text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:opacity-90">
                    {a.severity === "critical"
                      ? "Refund"
                      : "Resolve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =============================
          2-COLUMN SECTION
      ============================= */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* ACTIVITY */}
        <div className="bg-white border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-neutral-500">
            Activity
          </h2>

          {timeline.length === 0 ? (
            <div className="text-sm text-neutral-500">
              No recent activity.
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.slice(0, 6).map((t: any) => (
                <div
                  key={t.id}
                  className="flex justify-between text-sm"
                >
                  <div className="text-neutral-700">
                    {formatAction(t.step)} →{" "}
                    <span className="text-neutral-500">
                      {t.orderId}
                    </span>
                  </div>

                  <div className="text-neutral-400 text-xs">
                    {formatTime(t.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* METRICS */}
        <div className="bg-white border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-neutral-500">
            Performance
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Metric
              label="Automation"
              value={`${data.automationRate ?? 0}%`}
            />
            <Metric
              label="Avg Resolution"
              value={`${data.avgResolutionHours ?? 0}h`}
            />
            <Metric
              label="Refunds"
              value={data.impact?.refunded ?? 0}
            />
            <Metric
              label="Prevented"
              value={data.impact?.prevented ?? 0}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

/* =============================
   COMPONENTS
============================= */

function SeverityBadge({ severity }: { severity: string }) {
  const styles =
    severity === "critical"
      ? "bg-red-100 text-red-600"
      : severity === "high"
      ? "bg-orange-100 text-orange-600"
      : "bg-yellow-100 text-yellow-600"

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles}`}>
      {severity}
    </span>
  )
}

function Metric({ label, value }: any) {
  return (
    <div>
      <div className="text-neutral-500 text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

/* =============================
   HELPERS
============================= */

function formatAction(action: string) {
  switch (action) {
    case "refund":
      return "Refund issued"
    case "expedite_shipping":
      return "Shipping upgraded"
    case "notify_customer":
      return "Customer notified"
    default:
      return action
  }
}

function formatTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return "now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`

  return `${Math.floor(seconds / 86400)}d`
}
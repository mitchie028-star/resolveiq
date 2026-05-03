import { getDashboardData } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const data = await getDashboardData()

  const alerts = data.alertsList ?? []
  const timeline = data.timeline ?? []

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">

      {/* 🟢 SYSTEM STATUS */}
      <section className="bg-white rounded-2xl shadow p-5">
        <div className="text-sm text-neutral-400">
          System Status
        </div>

        <div className="text-xl font-semibold mt-1">
          ● Live — Preventing issues across {data.orders} orders
        </div>

        <div className="text-sm text-neutral-500 mt-1">
          Saved ${data.impact?.estimatedSavings ?? 0} this week
        </div>
      </section>

      {/* 🚨 ALERTS */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold mb-4">
          🚨 Action Required ({alerts.length})
        </h2>

        {alerts.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No active risks detected.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a: any) => (
              <div
                key={a.id}
                className="border rounded-xl p-4 flex justify-between"
              >
                <div>
                  <div className="font-medium">
                    {a.order_id}
                  </div>

                  <div className="text-sm text-neutral-600">
                    {a.message}
                  </div>
                </div>

                <button className="text-sm bg-black text-white px-3 py-1 rounded-lg">
                  Act
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ⚡ TIMELINE */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-semibold mb-4">
          ⚡ System Activity
        </h2>

        {timeline.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No recent activity.
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {timeline.slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex justify-between">
                <div>
                  {t.step} → {t.orderId}
                </div>

                <div className="text-neutral-400 text-xs">
                  {formatTime(t.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

// -------------------------
// 🧠 HELPERS
// -------------------------
function formatTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`

  return `${Math.floor(seconds / 86400)}d ago`
}
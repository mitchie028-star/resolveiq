import Image from "next/image"
import { getDashboardData } from "@/lib/dashboard-data"
import ActivityTicker from "@/components/LiveActivityPanel"

export const dynamic = "force-dynamic"

export default async function Home() {
  const data = await getDashboardData()

  const alerts = data.alertsList ?? []

  const refunds = data.actionsList.filter(
    (a: any) => a.action_type === "refund"
  ).length

  const estSavings = data.completedActions * 3

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* 🔥 HEADER */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ResolvedIQ Logo"
              width={44}
              height={44}
              className="rounded-lg"
            />

            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                ResolvedIQ
              </h1>
              <p className="text-sm text-gray-500">
                Preventing support tickets before they happen
              </p>
            </div>
          </div>

          <LiveBadge />
        </header>

        {/* ⚡ ACTIVITY */}
        <ActivityTicker actions={data.actionsList} />

        {/* 💰 HERO + QA (MERGED) */}
        <Hero
          savings={estSavings}
          tickets={data.completedActions}
          refunds={refunds}
          total={data.completedActions}
          failed={data.failedActions}
        />

        {/* 🚨 ACTION TABLE */}
        <ActionTable alerts={alerts} />

        {/* ⚙️ STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniStat
            label="Avg resolution time"
            value={`${data.avgResolutionHours ?? 0} hrs`}
          />

          <MiniStat
            label="System status"
            value={
              data.failedActions === 0
                ? "Healthy"
                : `${data.failedActions} failed`
            }
            danger={data.failedActions > 0}
          />
        </div>

      </div>
    </main>
  )
}

/* ---------------- LIVE BADGE ---------------- */

function LiveBadge() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
      </span>
      Live system
    </div>
  )
}

/* ---------------- 💰 HERO (WITH QA INSIDE) ---------------- */

function Hero({
  savings,
  tickets,
  refunds,
  total,
  failed,
}: {
  savings: number
  tickets: number
  refunds: number
  total: number
  failed: number
}) {
  const successRate =
    total === 0 ? 100 : Math.round(((total - failed) / total) * 100)

  return (
    <div className="bg-black text-white rounded-3xl px-8 py-7 shadow-xl space-y-6">

      {/* TOP ROW */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

        {/* LEFT */}
        <div>
          <p className="text-sm text-gray-400">Impact this week</p>

          <p className="text-5xl font-bold tracking-tight mt-2">
            ${savings}
          </p>

          <p className="text-gray-400 text-sm mt-2">
            saved from prevented support issues
          </p>
        </div>

        {/* RIGHT METRICS */}
        <div className="flex gap-10">
          <Metric label="Tickets avoided" value={tickets} />
          <Metric label="Refunds prevented" value={refunds} />
        </div>
      </div>

      {/* QA STRIP */}
      <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between">

        <div>
          <p className="text-xs text-gray-300">
            AI Quality Assurance
          </p>
          <p className="text-sm font-semibold">
            {successRate}% successful
          </p>
        </div>

        <div className="text-sm">
          {failed > 0 ? (
            <span className="text-red-400">
              {failed} need review
            </span>
          ) : (
            <span className="text-green-400">
              All good
            </span>
          )}
        </div>
      </div>

      {/* PROGRESS */}
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400"
          style={{ width: `${successRate}%` }}
        />
      </div>

    </div>
  )
}

function Metric({ label, value }: any) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

/* ---------------- 🚨 ACTION TABLE ---------------- */

function ActionTable({ alerts }: { alerts: any[] }) {
  const hasRisk = alerts.length > 0

  return (
    <section className="bg-white border rounded-3xl overflow-hidden">

      {/* HEADER */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {hasRisk ? "🚨 Action required" : "✅ All clear"}
          </h2>
          <p className="text-sm text-gray-500">
            {hasRisk
              ? `${alerts.length} customers at risk`
              : "No issues detected"}
          </p>
        </div>

        {hasRisk && (
          <span className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-full">
            {alerts.length} urgent
          </span>
        )}
      </div>

      {/* TABLE */}
      {!hasRisk ? (
        <div className="text-sm text-gray-500 py-10 text-center">
          Nothing to act on.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-6 py-3">Order</th>
              <th className="text-left px-6 py-3">Issue</th>
              <th className="text-left px-6 py-3">Severity</th>
              <th className="text-right px-6 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {alerts.map((a) => (
              <tr
                key={a.id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="px-6 py-4 font-medium">
                  {a.order_id}
                </td>

                <td className="px-6 py-4 text-gray-600">
                  {a.message}
                </td>

                <td className="px-6 py-4">
                  <SeverityBadge level={a.severity} />
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="text-sm bg-black text-white px-4 py-1.5 rounded-lg hover:opacity-90">
                    Fix →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function SeverityBadge({ level }: { level: string }) {
  const map: any = {
    high: "bg-red-100 text-red-600",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-gray-100 text-gray-600",
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${map[level] || map.low}`}>
      {level}
    </span>
  )
}

/* ---------------- SMALL STATS ---------------- */

function MiniStat({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string | number
  danger?: boolean
}) {
  return (
    <div
      className={`border rounded-2xl p-5
        ${danger ? "bg-red-50 border-red-200" : "bg-white"}`}
    >
      <p className="text-sm text-gray-500">{label}</p>

      <p
        className={`text-xl font-semibold mt-1 ${
          danger ? "text-red-600" : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}
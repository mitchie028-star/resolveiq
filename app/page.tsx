import Image from "next/image"
import { getDashboardData } from "@/lib/dashboard-data"
import ActivityTicker from "@/components/ActivityTicker"
import WorstCases from "@/components/WorstCases"

export const dynamic = "force-dynamic"

export default async function Home() {
  const data = await getDashboardData()

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">

      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="ResolvedIQ Logo"
            width={60}
            height={60}
            className="rounded-lg"
          />

          <div>
            <h1 className="text-3xl font-bold">ResolvedIQ Dashboard</h1>
            <p className="text-gray-600 text-sm">
              Proactive CX. Smarter Support. Happier Customers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Simulation
          </div>

          <div className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
            Demo Mode
          </div>
        </div>
      </div>

      {/* ⚡ ACTIVITY */}
      <ActivityTicker actions={data.actionsList} />

      {/* 💰 IMPACT */}
      <ImpactBar
        ticketsAvoided={data.completedActions}
        refundsIssued={
          data.actionsList.filter((a: any) => a.action_type === "refund").length
        }
        estSavings={data.completedActions * 3}
      />

      {/* 🧠 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card title="Orders" value={data.orders} />
        <Card title="Active Issues" value={data.activeAlerts} />
        <Card title="Resolved Issues" value={data.resolvedAlerts} />
        <Card title="Customer Updates" value={data.messages} />
        <Card title="Auto-Resolution Rate" value={`${data.resolutionRate}%`} />
        <Card title="Automation Efficiency" value={data.messagesPerAlert} />
        <Card title="Critical Risk Rate" value={`${data.highSeverityRatio}%`} />
      </div>

      {/* 🚨 WORST CASES */}
      <WorstCases />

      {/* ⚡ ACTION PIPELINE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Pending Actions" value={data.pendingActions} />
        <Card title="Failed Actions" value={data.failedActions} />
        <Card title="Completed Actions" value={data.completedActions} />

        <SystemStatus
          pending={data.pendingActions}
          failed={data.failedActions}
        />
      </div>

      {/* ⚡ PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="⚡ Performance">
          <Stat
            label="Avg Resolution Time"
            value={`${data.avgResolutionHours ?? 0} hrs`}
          />
        </Panel>

        <Panel title="📊 System Health">
          <Stat
            label="Alerts vs Resolved"
            value={`${data.resolvedAlerts} resolved / ${data.activeAlerts} active`}
          />
        </Panel>
      </div>

      {/* 🚨 ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="🚨 Active Alerts">
          {data.alertsList.length === 0 ? (
            <Empty text="No active alerts" />
          ) : (
            <div className="space-y-3">
              {data.alertsList.map((a: any) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="✅ Resolved Alerts">
          {data.resolvedList.length === 0 ? (
            <Empty text="No resolved alerts" />
          ) : (
            <div className="space-y-3">
              {data.resolvedList.map((a: any) => (
                <AlertCard key={a.id} alert={a} resolved />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ⚙️ ACTIONS */}
      <Panel title="⚙️ Live Actions">
        {data.actionsList.length === 0 ? (
          <Empty text="No actions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-2">Action</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Last Attempt</th>
                  <th>Next Retry</th>
                </tr>
              </thead>
              <tbody>
                {data.actionsList.map((a: any) => (
                  <tr key={a.id} className="border-b">
                    <td className="py-2 font-medium">
                      {formatAction(a.action_type)}
                    </td>
                    <td>{a.order_id}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>{a.retry_count ?? 0}</td>
                    <td className="text-xs text-gray-400">
                      {a.last_attempt_at
                        ? new Date(a.last_attempt_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="text-xs text-gray-400">
                      {a.next_retry_at
                        ? new Date(a.next_retry_at).toLocaleTimeString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  )
}

/* ---------------- UI COMPONENTS ---------------- */

function Card({ title, value }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  )
}

function Panel({ title, children }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value }: any) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function Empty({ text }: any) {
  return <p className="text-sm text-gray-400">{text}</p>
}

function AlertCard({ alert, resolved = false }: any) {
  return (
    <div className="border rounded-xl p-3 text-sm bg-gray-50">
      <p className="font-semibold">{alert.alert_type}</p>
      <p className="text-gray-600">{alert.message}</p>
      <div className="text-xs text-gray-400 mt-1">
        {alert.severity?.toUpperCase()} • {resolved ? "resolved" : alert.status}
      </div>
    </div>
  )
}

/* ---------------- SELLING COMPONENTS ---------------- */

function ImpactBar({ ticketsAvoided, refundsIssued, estSavings }: any) {
  return (
    <div className="bg-black text-white rounded-2xl p-6 flex flex-col md:flex-row md:justify-between gap-6">
      <div>
        <p className="text-sm text-gray-300">Support Load Reduced</p>
        <p className="text-2xl font-bold">{ticketsAvoided} tickets avoided</p>
      </div>

      <div>
        <p className="text-sm text-gray-300">Customer Recovery</p>
        <p className="text-2xl font-bold">{refundsIssued} refunds handled</p>
      </div>

      <div>
        <p className="text-sm text-gray-300">Estimated Savings</p>
        <p className="text-2xl font-bold">${estSavings}</p>
      </div>
    </div>
  )
}

function SystemStatus({ pending, failed }: any) {
  const healthy = failed === 0

  return (
    <div className="bg-white p-4 rounded-2xl border">
      <p className="text-xs text-gray-500">System Status</p>
      <p className={`text-lg font-semibold mt-1 ${healthy ? "text-green-600" : "text-red-600"}`}>
        {healthy ? "Healthy" : "Needs Attention"}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {pending} pending • {failed} failed
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700 animate-pulse",
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

function formatAction(type: string) {
  const map: any = {
    refund: "💸 Refund",
    discount: "🏷️ Discount",
    reship: "📦 Reship",
    notify_customer: "📩 Notify",
    expedite_shipping: "🚚 Expedite",
  }

  return map[type] || type
}
import Image from "next/image"
import { getDashboardData } from "@/lib/dashboard-data"

export const dynamic = "force-dynamic"

export default async function Home() {
  const data = await getDashboardData()

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">

      {/* 🔥 HEADER */}
      <div className="flex items-center gap-4">
        <Image
          src="/logo.png"
          alt="ResolvedIQ Logo"
          width={60}
          height={60}
          className="rounded-lg"
        />

        <div>
          <h1 className="text-3xl font-bold">
            ResolvedIQ Dashboard
          </h1>
          <p className="text-gray-600 text-sm">
            Proactive CX. Smarter Support. Happier Customers.
          </p>
        </div>
      </div>

      {/* 🔥 KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card title="Orders" value={data.orders} />
        <Card title="Active Alerts" value={data.activeAlerts} />
        <Card title="Resolved Alerts" value={data.resolvedAlerts} />
        <Card title="Messages Sent" value={data.messages} />
        <Card title="Resolution Rate" value={`${data.resolutionRate}%`} />

        {/* 🧠 Intelligence Metrics */}
        <Card title="Msg / Alert" value={data.messagesPerAlert} />
        <Card
          title="High Severity %"
          value={`${data.highSeverityRatio}%`}
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
        {/* Active */}
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

        {/* Resolved */}
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
    </main>
  )
}

// -------------------------
// 🧩 UI Components
// -------------------------

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
        {alert.severity?.toUpperCase()} •{" "}
        {resolved ? "resolved" : alert.status}
      </div>
    </div>
  )
}
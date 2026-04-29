export default function Home() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">
        ResolvedIQ Dashboard
      </h1>

      <p className="text-gray-600">
        AI-powered customer experience operations.
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-sm text-gray-500">Orders Processed</p>
          <p className="text-xl font-bold">--</p>
        </div>

        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-sm text-gray-500">Active Alerts</p>
          <p className="text-xl font-bold">--</p>
        </div>

        <div className="p-4 bg-white rounded-xl shadow">
          <p className="text-sm text-gray-500">Messages Sent</p>
          <p className="text-xl font-bold">--</p>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-3">🚨 Alerts</h2>
          <p className="text-gray-500 text-sm">
            No alerts yet
          </p>
        </div>

        {/* Messages */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-3">💬 Messages</h2>
          <p className="text-gray-500 text-sm">
            No messages yet
          </p>
        </div>
      </div>
    </main>
  )
}

"use client"

export default function DemoControls({
  onResolve,
  loading,
  hasActiveAlerts = true,
}: {
  onResolve: () => void
  loading: boolean
  hasActiveAlerts?: boolean
}) {
  return (
    <div className="bg-white border rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between gap-4">

      {/* LEFT: TEXT */}
      <div className="flex flex-col">
        <p className="text-xs text-gray-400">Demo Controls</p>
        <p className="text-sm font-medium text-gray-800">
          AI resolving issues in real time
        </p>
      </div>

      {/* RIGHT: ACTION */}
      <div className="flex items-center gap-3">

        {/* STATUS */}
        <div className="text-xs">
          {loading ? (
            <span className="text-yellow-600">Processing</span>
          ) : hasActiveAlerts ? (
            <span className="text-gray-500">Ready</span>
          ) : (
            <span className="text-green-600">All Clear</span>
          )}
        </div>

        {/* BUTTON */}
        <button
          onClick={onResolve}
          disabled={loading || !hasActiveAlerts}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            loading
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : !hasActiveAlerts
              ? "bg-green-100 text-green-700 cursor-default"
              : "bg-black text-white hover:opacity-90"
          }`}
        >
          {loading
            ? "Resolving..."
            : !hasActiveAlerts
            ? "Done"
            : "Resolve"}
        </button>
      </div>
    </div>
  )
}
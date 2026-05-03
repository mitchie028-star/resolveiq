"use client"

import { useState } from "react"

type Alert = {
  id: string
  order_id: string
  alert_type: string
  message: string
  severity: "low" | "medium" | "high"
}

/* ---------------- MAIN LIST ---------------- */

export default function WorstCases({ alerts = [] }: { alerts?: Alert[] }) {
  const [items, setItems] = useState(alerts)

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id))
  }

  if (!items.length) {
    return (
      <div className="text-sm text-gray-500 py-10 text-center">
        ✅ No risky orders right now
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((alert) => (
        <CaseCard
          key={alert.id}
          alert={alert}
          onResolved={() => removeItem(alert.id)}
        />
      ))}
    </div>
  )
}

/* ---------------- CASE CARD ---------------- */

function CaseCard({
  alert,
  onResolved,
}: {
  alert: Alert
  onResolved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleAction = async (type: string) => {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: alert.order_id,
          action_type: type,
        }),
      })

      if (!res.ok) throw new Error("failed")

      // ✅ instant UI feedback (removes card)
      onResolved()
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- LOGIC ---------------- */

  const severityStyles = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  }

  const recommendedAction =
    alert.severity === "high"
      ? "reship"
      : alert.severity === "medium"
      ? "notify_customer"
      : "notify_customer"

  const actionLabelMap: Record<string, string> = {
    notify_customer: "Notify customer",
    refund: "Issue refund",
    reship: "Reship order",
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-white border rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition">

      {/* LEFT */}
      <div className="space-y-2 max-w-lg">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <p className="font-semibold text-sm">
            Order {alert.order_id}
          </p>

          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              severityStyles[alert.severity]
            }`}
          >
            {alert.severity.toUpperCase()}
          </span>
        </div>

        {/* MESSAGE */}
        <p className="text-sm text-gray-600">
          {alert.message}
        </p>

        {/* AI RECOMMENDATION */}
        <p className="text-xs text-gray-500">
          🤖 Recommended:{" "}
          <span className="font-medium text-gray-800">
            {actionLabelMap[recommendedAction]}
          </span>
        </p>

        {/* ERROR */}
        {error && (
          <p className="text-xs text-red-500">
            Action failed. Please retry.
          </p>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">

        {/* Secondary */}
        <button
          onClick={() => handleAction("notify_customer")}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          Notify
        </button>

        <button
          onClick={() => handleAction("refund")}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          Refund
        </button>

        {/* PRIMARY CTA */}
        <button
          onClick={() => handleAction(recommendedAction)}
          disabled={loading}
          className="text-sm px-4 py-2 rounded-lg bg-black text-white font-medium"
        >
          {loading ? "Processing..." : "Fix now →"}
        </button>
      </div>
    </div>
  )
}
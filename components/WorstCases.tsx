"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Case = {
  order_id: string
  score: number
  refund_amount: number | null
  message_count: number
  severity: string
  issue: string
  is_frustrated: boolean
}

export default function WorstCases() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/run-engines/worst-cases")

        if (!res.ok) {
          const text = await res.text()
          console.error("API ERROR:", text)
          throw new Error(text)
        }

        const data = await res.json()
        setCases(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setError("Failed to load worst cases")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const getScoreColor = (score: number) => {
    if (score < 60) return "text-red-600"
    if (score < 75) return "text-yellow-600"
    return "text-green-600"
  }

  const getSeverityStyle = (severity: string) => {
    const map: Record<string, string> = {
      high: "bg-red-100 text-red-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-gray-100 text-gray-600",
    }
    return map[severity?.toLowerCase()] || map.low
  }

  const renderSignals = (c: Case) => {
    const hasRefund = !!c.refund_amount && c.refund_amount > 0

    return (
      <div className="flex flex-col gap-1 text-xs">
        {c.is_frustrated && (
          <span className="text-red-600">⚠️ Frustrated</span>
        )}

        {c.message_count > 4 && (
          <span className="text-yellow-600">⚠️ Many messages</span>
        )}

        {hasRefund && (
          <span className="text-red-500">💸 Refund issued</span>
        )}

        {!c.is_frustrated && c.message_count <= 2 && !hasRefund && (
          <span className="text-green-600">✅ Clean</span>
        )}
      </div>
    )
  }

  // -----------------------
  // STATES
  // -----------------------

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow">
        Loading worst cases...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow text-red-500">
        {error}
      </div>
    )
  }

  // -----------------------
  // UI
  // -----------------------

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        🚨 Top 10 Worst Cases
      </h2>

      {cases.length === 0 ? (
        <div className="text-gray-500 text-sm">
          No bad cases yet. System is performing well 👍
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-2">Order</th>
                <th>Score</th>
                <th>Refund</th>
                <th>Messages</th>
                <th>Severity</th>
                <th>Issue</th>
                <th>Signals</th>
              </tr>
            </thead>

            <tbody>
              {cases.map((c) => {
                const hasRefund =
                  !!c.refund_amount && c.refund_amount > 0

                return (
                  <tr
                    key={c.order_id}
                    onClick={() =>
                      router.push(`/cases/${c.order_id}`)
                    }
                    className="border-b hover:bg-gray-50 cursor-pointer transition"
                  >
                    <td className="py-2 font-mono text-xs">
                      {c.order_id.slice(0, 8)}...
                    </td>

                    <td
                      className={`font-semibold ${getScoreColor(
                        c.score
                      )}`}
                    >
                      {c.score}
                    </td>

                    <td className="text-red-600">
                      {hasRefund
                        ? `₱${c.refund_amount}`
                        : "-"}
                    </td>

                    <td>{c.message_count}</td>

                    <td>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyle(
                          c.severity
                        )}`}
                      >
                        {c.severity}
                      </span>
                    </td>

                    <td className="text-gray-700">
                      {c.issue}
                    </td>

                    <td>{renderSignals(c)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
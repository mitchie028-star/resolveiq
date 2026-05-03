"use client"

import { useEffect, useState } from "react"

type Action = {
  id: string | number
  type: string
  orderId: string
  success?: boolean | null
}

type FeedItem = Action & {
  createdAt: number
}

export default function LiveActivityPanel({ actions }: { actions: Action[] }) {
  const [feed, setFeed] = useState<FeedItem[]>([])

  // -------------------------
  // 🧠 INIT FEED
  // -------------------------
  useEffect(() => {
    const seeded = actions.slice(0, 6).map((a, i) => ({
      ...a,
      createdAt: Date.now() - i * 4000,
    }))

    setFeed(seeded)
  }, [actions])

  // -------------------------
  // ⚡ SIMULATED REAL-TIME
  // -------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!actions.length) return

      const random = actions[Math.floor(Math.random() * actions.length)]

      // prevent duplicate spam (same order + type back-to-back)
      setFeed((prev) => {
        if (
          prev[0] &&
          prev[0].orderId === random.orderId &&
          prev[0].type === random.type
        ) {
          return prev
        }

        const newItem: FeedItem = {
          ...random,
          id: Math.random(),
          createdAt: Date.now(),
        }

        return [newItem, ...prev.slice(0, 7)]
      })
    }, 2200 + Math.random() * 1500) // less robotic timing

    return () => clearInterval(interval)
  }, [actions])

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">

      {/* HEADER */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live activity
        </div>
      </div>

      {/* FEED */}
      <div className="text-sm divide-y max-h-[520px] overflow-hidden">
        {feed.map((a) => (
          <div
            key={a.id}
            className="px-4 py-3 flex justify-between items-center animate-fade-in"
          >
            <div className="flex items-center gap-2 min-w-0">

              {/* STATUS DOT */}
              <span
                className={`w-2 h-2 rounded-full ${
                  a.success === true
                    ? "bg-green-500"
                    : a.success === false
                    ? "bg-red-500"
                    : "bg-yellow-400"
                }`}
              />

              {/* TEXT */}
              <span className="text-gray-700 truncate">
                {formatAction(a)}
              </span>
            </div>

            {/* TIME */}
            <span className="text-xs text-gray-400 ml-3 whitespace-nowrap">
              {formatTimeAgo(a.createdAt)}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}

/* ---------------- FORMATTER ---------------- */

function formatAction(a: Action) {
  const map: Record<string, string> = {
    refund: "Refund issued",
    expedite_shipping: "Shipping upgraded",
    notify_customer: "Customer notified",
  }

  return `${map[a.type] || a.type} → ${a.orderId}`
}

/* ---------------- TIME AGO ---------------- */

function formatTimeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)

  if (diff < 3) return "just now"
  if (diff < 60) return `${diff}s ago`

  const mins = Math.floor(diff / 60)
  return `${mins}m ago`
}
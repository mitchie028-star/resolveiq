"use client"

import { useEffect, useMemo, useState } from "react"

export default function ActivityTicker({ actions = [] }: any) {
  const [index, setIndex] = useState(0)

  // 🔥 Generate events dynamically from real actions
  const events = useMemo(() => {
    if (!actions || actions.length === 0) {
      return ["System idle…"]
    }

    return actions.map((a: any) => {
      const order = a.order_id || "Unknown order"

      switch (a.action_type) {
        case "refund":
          return `💸 Refund issued for ${order}`
        case "reship":
          return `📦 Reship initiated for ${order}`
        case "notify_customer":
          return `📩 Customer notified (${order})`
        case "discount":
          return `🏷️ Discount applied to ${order}`
        case "expedite_shipping":
          return `🚚 Shipping expedited for ${order}`
        default:
          return `⚡ Action executed for ${order}`
      }
    })
  }, [actions])

  useEffect(() => {
    if (events.length === 0) return

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length)
    }, 2200)

    return () => clearInterval(interval)
  }, [events])

  return (
    <div className="bg-white border rounded-xl px-4 py-2 text-sm text-gray-600 overflow-hidden">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Live Activity</span>

        {/* subtle pulse */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>

        {/* animated text */}
        <span
          key={index}
          className="transition-all duration-300 ease-in-out"
        >
          {events[index]}
        </span>
      </div>
    </div>
  )
}
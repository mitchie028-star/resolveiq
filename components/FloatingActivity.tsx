"use client"

import { useEffect, useState } from "react"

export default function FloatingActivity({ actions }: any) {
  const [open, setOpen] = useState(true)
  const [feed, setFeed] = useState<any[]>([])

  // -------------------------
  // INIT
  // -------------------------
  useEffect(() => {
    const initial = actions.map(formatEvent)
    setFeed(initial.reverse().slice(0, 6))
  }, [actions])

  // -------------------------
  // SIMULATED LIVE EVENTS
  // -------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const event = generateFakeEvent()

      setFeed((prev) => [event, ...prev].slice(0, 8))
    }, randomBetween(2000, 4000))

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* COLLAPSED BUTTON */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-black text-white px-4 py-2 rounded-full shadow-lg text-sm"
        >
          Live activity
        </button>
      )}

      {/* PANEL */}
      {open && (
        <div className="w-[320px] bg-white border rounded-2xl shadow-2xl overflow-hidden">

          {/* HEADER */}
          <div className="px-4 py-2 border-b flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-500">●</span>
              <span className="font-medium">Live activity</span>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-black"
            >
              ✕
            </button>
          </div>

          {/* FEED */}
          <div className="max-h-[260px] overflow-y-auto px-4 py-2 space-y-2 text-sm">
            {feed.map((item) => (
              <div
                key={item.id}
                className="flex justify-between animate-fade-in"
              >
                <span className="text-gray-700">
                  {item.message}
                </span>

                <span className="text-xs text-gray-400">
                  {timeAgo(item.time)}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}

/* ---------------- HELPERS ---------------- */

function formatEvent(a: any) {
  return {
    id: a.id,
    message: `${humanize(a.type)} → ${a.orderId}`,
    time: Date.now(),
  }
}

function generateFakeEvent() {
  const types = ["refund", "expedite_shipping", "notify_customer"]

  const messages: any = {
    refund: ["Refund issued", "Compensation sent"],
    expedite_shipping: ["Shipping upgraded", "Expedite request sent"],
    notify_customer: ["Customer notified", "Delay apology sent"],
  }

  const type = types[Math.floor(Math.random() * types.length)]
  const msg =
    messages[type][Math.floor(Math.random() * messages[type].length)]

  return {
    id: crypto.randomUUID(),
    message: `${msg} → ORD-${randomBetween(1000, 9999)}`,
    time: Date.now(),
  }
}

function humanize(type: string) {
  return type.replace("_", " ")
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000)

  if (diff < 5) return "now"
  if (diff < 60) return `${diff}s`

  return `${Math.floor(diff / 60)}m`
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
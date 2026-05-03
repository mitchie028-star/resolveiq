"use client"

import { useEffect, useState } from "react"

export default function HeroClient({
  savings,
  tickets,
  refunds,
  total,
  failed,
}: any) {
  const [displaySavings, setDisplaySavings] = useState(0)
  const [displayTickets, setDisplayTickets] = useState(0)
  const [displayRefunds, setDisplayRefunds] = useState(0)

  const successRate =
    total === 0 ? 100 : Math.round(((total - failed) / total) * 100)

  // -------------------------
  // 🚀 INITIAL COUNT-UP
  // -------------------------
  useEffect(() => {
    animate(setDisplaySavings, savings)
    animate(setDisplayTickets, tickets)
    animate(setDisplayRefunds, refunds)
  }, [savings, tickets, refunds])

  // -------------------------
  // ⚡ LIVE DRIFT (NEW)
  // -------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      // simulate system activity
      setDisplaySavings((v) => v + random(0, 2))
      setDisplayTickets((v) => v + (Math.random() > 0.7 ? 1 : 0))
      setDisplayRefunds((v) => v + (Math.random() > 0.9 ? 1 : 0))
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-black text-white rounded-3xl px-8 py-7 shadow-xl space-y-6">

      {/* TOP */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

        <div>
          <p className="text-sm text-gray-400">Impact this week</p>

          <p className="text-5xl font-bold mt-2 tabular-nums">
            ${displaySavings}
          </p>

          <p className="text-gray-400 text-sm mt-2">
            saved from prevented support issues
          </p>
        </div>

        <div className="flex gap-10">
          <Metric label="Tickets avoided" value={displayTickets} />
          <Metric label="Refunds issued" value={displayRefunds} />
        </div>
      </div>

      {/* QA STRIP */}
      <div className="bg-white/10 rounded-xl px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-300">AI Quality Assurance</p>
          <p className="text-sm font-semibold">
            {successRate}% successful
          </p>
        </div>

        <LivePulse />

      </div>

      {/* PROGRESS */}
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 transition-all duration-700 ease-out"
          style={{ width: `${successRate}%` }}
        />
      </div>
    </div>
  )
}

/* ---------------- HELPERS ---------------- */

function animate(setter: any, target: number) {
  let current = 0
  const step = Math.max(1, Math.floor(target / 20))

  const interval = setInterval(() => {
    current += step
    if (current >= target) {
      setter(target)
      clearInterval(interval)
    } else {
      setter(current)
    }
  }, 30)
}

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* ---------------- METRIC ---------------- */

function Metric({ label, value }: any) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-semibold mt-1 tabular-nums">
        {value}
      </p>
    </div>
  )
}

/* ---------------- LIVE PULSE ---------------- */

function LivePulse() {
  return (
    <div className="flex items-center gap-2 text-sm text-green-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      Processing live
    </div>
  )
}
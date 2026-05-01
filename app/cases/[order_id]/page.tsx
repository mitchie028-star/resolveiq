"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type QA = {
  score: number
  refund_amount: number
  message_count: number
  resolution_score: number
  cost_score: number
  efficiency_score: number
  communication_score: number
  risk_score: number
}

type Message = {
  content: string
  created_at: string
  message_type?: string
}

export default function CaseInspector() {
  const params = useParams()
  const orderId = params.order_id as string

  const [qa, setQa] = useState<QA | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // Fetch QA
    fetch(`/api/cases/${orderId}`)
      .then((res) => res.json())
      .then(setQa)

    // Fetch messages
    fetch(`/api/messages/${orderId}`)
      .then((res) => res.json())
      .then(setMessages)
  }, [orderId])

  // -------------------------
  // 🧠 INSIGHTS ENGINE (UI LAYER)
  // -------------------------

  const insights: string[] = []
  const recommendations: string[] = []

  if (qa) {
    if (qa.message_count > 4) {
      insights.push("⚠️ Multiple follow-ups from customer")
      recommendations.push("Reduce back-and-forth with proactive updates")
    }

    if (qa.refund_amount > 0) {
      insights.push("💸 Refund issued")
      recommendations.push("Review refund policy or resolution flow")
    }

    if (qa.score < 60) {
      insights.push("🚨 Poor resolution quality")
      recommendations.push("Escalate similar cases earlier")
    }

    if (qa.score >= 80 && qa.message_count > 3) {
      insights.push("⚠️ Good outcome but inefficient handling")
      recommendations.push("Automate updates to reduce messages")
    }

    const hasFrustration = messages.some((m) =>
      m.content.toLowerCase().includes("frustrat")
    )

    if (hasFrustration) {
      insights.push("😡 Customer frustration detected")
      recommendations.push("Improve response tone or speed")
    }

    const hasDelay = messages.some((m) => m.message_type === "delay")

    if (hasDelay) {
      insights.push("📦 Delivery delay triggered this case")
      recommendations.push("Improve logistics visibility or alerts")
    }
  }

  // -------------------------
  // 🎨 UI
  // -------------------------

  if (!qa) {
    return <div className="p-8">Loading case...</div>
  }

  return (
    <main className="p-8 space-y-6 bg-gray-50 min-h-screen">

      {/* 🔍 HEADER */}
      <div>
        <h1 className="text-2xl font-bold">🔍 Case Inspector</h1>
        <p className="text-sm text-gray-500">
          Order: {orderId}
        </p>
      </div>

      {/* 🎯 SUMMARY */}
      <div className="bg-white p-6 rounded-2xl shadow grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="QA Score" value={qa.score} />
        <Stat label="Refund" value={`₱${qa.refund_amount}`} />
        <Stat label="Messages" value={qa.message_count} />
        <Stat
          label="Severity"
          value={
            qa.score < 60
              ? "HIGH"
              : qa.score < 75
              ? "MEDIUM"
              : "LOW"
          }
        />
      </div>

      {/* 🧠 WHAT WENT WRONG */}
      <Panel title="🧠 What went wrong">
        {insights.length === 0 ? (
          <Empty text="No major issues detected" />
        ) : (
          <ul className="space-y-2">
            {insights.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 💡 RECOMMENDATIONS */}
      <Panel title="💡 Recommended Actions">
        {recommendations.length === 0 ? (
          <Empty text="No recommendations needed" />
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 📊 QA BREAKDOWN */}
      <Panel title="📊 QA Breakdown">
        <Grid>
          <Stat label="Resolution" value={qa.resolution_score} />
          <Stat label="Cost" value={qa.cost_score} />
          <Stat label="Efficiency" value={qa.efficiency_score} />
          <Stat label="Communication" value={qa.communication_score} />
          <Stat label="Risk" value={qa.risk_score} />
        </Grid>
      </Panel>

      {/* 📜 TIMELINE */}
      <Panel title="📜 Timeline">
        {messages.length === 0 ? (
          <Empty text="No activity" />
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className="text-sm border-b pb-2">
                <p>{m.content}</p>
                <p className="text-xs text-gray-400">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </main>
  )
}

// -------------------------
// 🧩 COMPONENTS
// -------------------------

function Panel({ title, children }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value }: any) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}

function Grid({ children }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {children}
    </div>
  )
}

function Empty({ text }: any) {
  return <p className="text-sm text-gray-400">{text}</p>
}
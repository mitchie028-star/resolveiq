type Message = {
  content: string
  created_at?: string
}

export type RiskResult = {
  score: number
  severity: "low" | "medium" | "high"
  signals: string[]
}

// -----------------------
// 🧠 HELPERS
// -----------------------
function matchPattern(text: string, pattern: string): boolean {
  // Phrase match → simple includes (more reliable)
  if (pattern.includes(" ")) {
    return text.includes(pattern)
  }

  // Single word → strict boundary match
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`\\b${escaped}\\b`, "i")
  return regex.test(text)
}

// -----------------------
// 🚀 MAIN ENGINE
// -----------------------
export function computeDelayRisk(messages: Message[]): RiskResult {
  if (!messages || messages.length === 0) {
    return { score: 0, severity: "low", signals: [] }
  }

  // Normalize text
  const texts = messages.map((m) =>
    (m.content || "").toLowerCase()
  )

  const combined = texts.join(" ")

  let score = 0
  const signals: string[] = []
  const triggered = new Set<string>()

  // -----------------------
  // 📡 SIGNAL DEFINITIONS
  // -----------------------
  const SIGNALS = [
    {
      name: "wismo",
      weight: 20,
      patterns: [
        "where is my order",
        "where is my package",
        "order status",
      ],
      message: "Customer asking for order status",
    },
    {
      name: "delay",
      weight: 30,
      patterns: [
        "delay",
        "delayed",
        "late",
        "not arrived",
        "hasn't arrived",
      ],
      message: "Delivery delay detected",
    },
    {
      name: "follow_up",
      weight: 20,
      patterns: ["still waiting", "hello", "any update"],
      message: "Customer followed up",
    },
    {
      name: "frustration",
      weight: 40,
      patterns: [
        "frustrat",
        "angry",
        "bad service",
        "terrible",
        "unacceptable",
      ],
      message: "Frustration signals detected",
    },
  ]

  // -----------------------
  // 🔎 TEXT SIGNALS
  // -----------------------
  for (const signal of SIGNALS) {
    const matched = signal.patterns.some((pattern) =>
      matchPattern(combined, pattern)
    )

    if (matched && !triggered.has(signal.name)) {
      score += signal.weight
      signals.push(signal.message)
      triggered.add(signal.name)
    }
  }

  // -----------------------
  // 📈 BEHAVIOR SIGNALS
  // -----------------------

  // Multiple messages
  if (messages.length >= 3) {
    score += 10
    signals.push("Multiple messages from customer")
  }

  // Safe timestamp extraction
  const timestamps = messages
    .map((m) =>
      m.created_at ? new Date(m.created_at).getTime() : null
    )
    .filter((t): t is number => t !== null)

  // Rapid follow-ups
  if (timestamps.length >= 2) {
    const timeDiff =
      Math.max(...timestamps) - Math.min(...timestamps)

    const minutes = timeDiff / (1000 * 60)

    if (minutes < 10) {
      score += 15
      signals.push("Rapid follow-ups detected")
    }
  }

  // -----------------------
  // 🌱 POSITIVE COOL-DOWN
  // -----------------------
  const positivePatterns = [
    "thank you",
    "thanks",
    "appreciate",
    "got it",
  ]

  const hasPositive = positivePatterns.some((pattern) =>
    matchPattern(combined, pattern)
  )

  if (hasPositive) {
    score -= 15
    signals.push("Customer tone improved")
  }

  // -----------------------
  // 🔒 CLAMP SCORE
  // -----------------------
  score = Math.max(0, Math.min(score, 100))

  // -----------------------
  // 🚦 SEVERITY
  // -----------------------
  let severity: "low" | "medium" | "high" = "low"

  if (score >= 60) severity = "high"
  else if (score >= 30) severity = "medium"

  return { score, severity, signals }
}
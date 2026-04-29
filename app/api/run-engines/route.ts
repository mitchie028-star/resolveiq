import { NextResponse } from "next/server"
import { runAlertEngine } from "@/lib/alert-engine"
import { runDecisionEngine } from "@/lib/decision-engine"

export async function GET() {
  try {
    await runAlertEngine()
    await runDecisionEngine()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Engine run failed:", err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
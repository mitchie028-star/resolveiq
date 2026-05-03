import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

// -------------------------
// GET /api/alerts
// -------------------------
export async function GET() {
  try {
    const supabase = createServerClient()

    const { data: alerts, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Fetch alerts failed:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(alerts || [])
  } catch (err: any) {
    console.error("❌ Unexpected error:", err)

    return NextResponse.json(
      { error: err.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
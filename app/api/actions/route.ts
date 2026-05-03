import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// -------------------------
// 🚀 POST: CREATE ACTION
// -------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      alert_id,
      order_id,
      merchant_id,
      action_type,
      priority = "medium",
      payload = {},
      metadata = {},
    } = body

    // -------------------------
    // VALIDATION
    // -------------------------
    if (!alert_id || !order_id || !merchant_id || !action_type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (alert_id, order_id, merchant_id, action_type)",
        },
        { status: 400 }
      )
    }

    // -------------------------
    // INIT SUPABASE (SERVER SAFE)
    // -------------------------
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // -------------------------
    // DUPLICATE PROTECTION
    // -------------------------
    const { data: existing } = await supabase
      .from("actions")
      .select("id")
      .eq("alert_id", alert_id)
      .eq("action_type", action_type)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Action already exists",
      })
    }

    // -------------------------
    // INSERT ACTION
    // -------------------------
    const insertPayload = {
      alert_id,
      order_id,
      merchant_id,
      action_type,
      status: "pending",
      priority,
      payload,
      metadata,
      retry_count: 0,
      created_at: new Date().toISOString(),
    }

    console.log("📦 API Creating action:", insertPayload)

    const { data, error } = await supabase
      .from("actions")
      .insert(insertPayload)
      .select()

    if (error) {
      console.error("❌ Action insert failed:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // -------------------------
    // SUCCESS
    // -------------------------
    return NextResponse.json({
      success: true,
      action: data?.[0] || null,
    })
  } catch (err: any) {
    console.error("❌ Unexpected error:", err)

    return NextResponse.json(
      {
        error: err.message || "Unexpected error",
      },
      { status: 500 }
    )
  }
}
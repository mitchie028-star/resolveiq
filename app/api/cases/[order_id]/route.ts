import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// -----------------------
// UUID VALIDATION
// -----------------------
const isValidUUID = (id: string) => {
  if (!id) return false

  const clean = id.trim().toLowerCase()

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    clean
  )
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id?: string; order_id?: string }> }
) {
  try {
    const params = await context.params

    const raw = params?.order_id ?? params?.id ?? null
    const order_id = Array.isArray(raw)
      ? raw[0]?.trim()
      : raw?.trim()

    if (!order_id || order_id === "unknown" || !isValidUUID(order_id)) {
      return NextResponse.json(
        {
          messages: [],
          count: 0,
          hasMessages: false,
          error: "Invalid order_id",
        },
        { status: 400 }
      )
    }

    // -----------------------
    // ✅ FIXED FILTER
    // -----------------------
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, created_at, message_type")
      .eq("order_id", order_id)
      .or("message_type.is.null,message_type.not.in.(internal,system)")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("CASE API ERROR:", error)

      return NextResponse.json(
        {
          messages: [],
          count: 0,
          hasMessages: false,
          error: "Database error",
        },
        { status: 500 }
      )
    }

    const messages = (data || []).map((m) => ({
      id: m.id,
      content: m.content || "",
      created_at: m.created_at,
      message_type: m.message_type ?? null,
    }))

    return NextResponse.json({
      messages,
      count: messages.length,
      hasMessages: messages.length > 0,
    })
  } catch (err) {
    console.error("UNEXPECTED ERROR:", err)

    return NextResponse.json(
      {
        messages: [],
        count: 0,
        hasMessages: false,
        error: "Unexpected server error",
      },
      { status: 500 }
    )
  }
}
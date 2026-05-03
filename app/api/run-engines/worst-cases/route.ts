import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("qa_results")
      .select("*")
      .order("score", { ascending: true })
      .limit(10)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (err) {
    console.error("WORST CASES API ERROR:", err)

    return NextResponse.json(
      { error: "Failed to load worst cases" },
      { status: 500 }
    )
  }
}
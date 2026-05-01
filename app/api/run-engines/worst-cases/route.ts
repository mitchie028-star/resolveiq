import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, serviceKey)

export async function GET() {
  try {
    const { data, error } = await supabase.rpc("get_worst_cases")

    if (error) {
      console.error("❌ Supabase RPC Error:", error)

      return Response.json(
        { error: error.message || "Failed to fetch worst cases" },
        { status: 500 }
      )
    }

    return Response.json(data ?? [])
  } catch (err: any) {
    console.error("🔥 Unexpected API Error:", err)

    return Response.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}
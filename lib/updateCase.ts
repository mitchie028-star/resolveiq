import { createClient } from "@supabase/supabase-js"
import { computeDelayRisk } from "./core/risk-engine"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function updateCase(order_id: string) {
  try {
    // -----------------------
    // FETCH CLEAN MESSAGES
    // -----------------------
    const { data, error } = await supabase
      .from("messages")
      .select("content, created_at, message_type")
      .eq("order_id", order_id)
      .or("message_type.is.null,message_type.not.in.(internal,system)")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Failed to fetch messages:", error)
      return
    }

    const messages = data || []

    // -----------------------
    // COMPUTE RISK
    // -----------------------
    const risk = computeDelayRisk(messages)

    const score = risk.score
    const severity = risk.severity
    const signals = risk.signals

    const latest = messages[messages.length - 1]

    // -----------------------
    // FETCH EXISTING CASE (idempotency)
    // -----------------------
    const { data: existing } = await supabase
      .from("cases")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle()

    const unchanged =
      existing &&
      existing.score === score &&
      existing.severity === severity &&
      JSON.stringify(existing.signals || []) === JSON.stringify(signals)

    if (unchanged) {
      return
    }

    // -----------------------
    // UPSERT CASE
    // -----------------------
    const { error: upsertError } = await supabase
      .from("cases")
      .upsert({
        order_id,
        score,
        severity,
        signals, // ✅ new field (make sure column exists)
        last_message: latest?.content || "",
        last_activity: latest?.created_at || null,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      console.error("❌ Failed to upsert case:", upsertError)
      return
    }

    console.log("✅ Case updated:", order_id)
  } catch (err) {
    console.error("❌ Unexpected error in updateCase:", err)
  }
}
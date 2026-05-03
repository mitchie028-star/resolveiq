import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

// -------------------------
// 🔌 INTEGRATIONS
// -------------------------

async function sendEmail(payload: any) {
  // 👉 Replace with Resend / SendGrid later
  console.log("📧 Email sent:", payload)

  // Example (Resend):
  // await resend.emails.send({
  //   from: "support@yourapp.com",
  //   to: payload.email,
  //   subject: "Order update",
  //   html: "<p>Your order is delayed...</p>",
  // })
}

async function callWebhook(payload: any) {
  if (!process.env.WEBHOOK_URL) return

  await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  console.log("🔗 Webhook called")
}

async function shopifyExpedite(orderId: string) {
  // ⚠️ Replace with real fulfillment API later
  console.log("🚚 Shopify expedite:", orderId)
}

async function shopifyRefund(orderId: string, amount: number) {
  if (!process.env.SHOPIFY_STORE || !process.env.SHOPIFY_TOKEN) {
    console.log("⚠️ Shopify not configured")
    return
  }

  const url = `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/refunds.json`

  await fetch(url, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refund: {
        note: "Delay compensation",
        transactions: [
          {
            kind: "refund",
            amount,
          },
        ],
      },
    }),
  })

  console.log("💸 Shopify refund:", { orderId, amount })
}

// -------------------------
// 🧠 EXECUTOR
// -------------------------

export async function POST() {
  const supabase = createServerClient()

  console.log("⚡ Action Executor started")

  // -------------------------
  // FETCH (LOCK LIGHT)
  // -------------------------
  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(20)

  if (error) {
    console.error("❌ Fetch failed:", error)
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 })
  }

  if (!actions?.length) {
    console.log("⚠️ No pending actions")
    return NextResponse.json({ ok: true })
  }

  // -------------------------
  // PROCESS LOOP
  // -------------------------
  for (const action of actions) {
    try {
      console.log("⚙️ Executing:", action.action_type, action.order_id)

      // 🛑 Double-check (idempotency safety)
      if (action.status !== "pending") {
        console.log("⛔ Skipped (already handled):", action.id)
        continue
      }

      // -------------------------
      // EXECUTE
      // -------------------------
      switch (action.action_type) {
        case "notify_customer":
          await sendEmail(action.payload)
          break

        case "expedite_shipping":
          await shopifyExpedite(action.order_id)
          break

        case "refund":
          await shopifyRefund(
            action.order_id,
            action.payload?.amount || 0
          )
          break

        default:
          console.log("⚠️ Unknown action:", action.action_type)
      }

      // -------------------------
      // OPTIONAL WEBHOOK
      // -------------------------
      await callWebhook({
        type: action.action_type,
        order_id: action.order_id,
        merchant_id: action.merchant_id,
      })

      // -------------------------
      // MARK COMPLETED
      // -------------------------
      await supabase
        .from("actions")
        .update({
          status: "completed",
          executed_at: new Date().toISOString(),
        })
        .eq("id", action.id)

      console.log("✅ Completed:", action.id)

    } catch (err) {
      console.error("❌ Execution failed:", action.id, err)

      const retryCount = (action.retry_count || 0) + 1
      const shouldFail = retryCount >= 3

      await supabase
        .from("actions")
        .update({
          retry_count: retryCount,
          status: shouldFail ? "failed" : "pending",
        })
        .eq("id", action.id)

      console.log(
        shouldFail
          ? "💀 Marked as failed"
          : "🔁 Scheduled retry",
        action.id
      )
    }
  }

  console.log("✅ Action Executor finished")

  return NextResponse.json({ ok: true })
}
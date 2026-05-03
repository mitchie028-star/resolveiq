import { createServerClient } from "./supabase-server"

// -------------------------
// 🧠 DEFAULT CONFIG
// -------------------------
const DEFAULT_CONFIG = {
  refund_config: {
    enabled: true,
    base_amount: 20,
    multipliers: {
      low: 0.5,
      medium: 1,
      high: 1.5,
      critical: 2,
    },
  },
  automation_config: {
    refund_after_hours: 24,
  },
}

// -------------------------
// 🧩 MERGE HELPER
// -------------------------
function deepMerge(base: any, override: any) {
  const result = { ...base }

  for (const key in override) {
    if (
      override[key] &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key])
    ) {
      result[key] = deepMerge(base[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }

  return result
}

// -------------------------
// 🚀 LOAD CONFIG
// -------------------------
export async function getMerchantConfig(merchant_id: string) {
  const supabase = createServerClient()

  const { data: base } = await supabase
    .from("merchant_configs")
    .select("*")
    .eq("merchant_id", merchant_id)
    .eq("is_active", true)
    .single()

  let config = base || {}

  // -------------------------
  // 🔁 APPLY OVERRIDES
  // -------------------------
  const { data: overrides } = await supabase
    .from("merchant_config_overrides")
    .select("*")
    .eq("merchant_id", merchant_id)

  if (overrides) {
    for (const o of overrides) {
      config[o.config_key] = deepMerge(
        config[o.config_key] || {},
        o.value
      )
    }
  }

  // -------------------------
  // 🧠 FINAL MERGE WITH DEFAULT
  // -------------------------
  const finalConfig = deepMerge(DEFAULT_CONFIG, config)

  console.log("⚙️ CONFIG LOADED:", {
    merchant_id,
    refund: finalConfig.refund_config,
  })

  return finalConfig
}
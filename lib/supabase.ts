import { createClient } from '@supabase/supabase-js'

// =========================
// 🔹 ENV VARIABLES
// =========================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// =========================
// 🔒 VALIDATION (fail fast)
// =========================
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// =========================
// 🚀 CLIENT
// =========================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // no auth needed for now
  },
})
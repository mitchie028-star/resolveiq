import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // -----------------------------
    // FETCH DATA (parallel = faster)
    // -----------------------------
    const [
      { data: cases, error: casesError },
      { data: actions, error: actionsError },
      { count: ordersCount, error: ordersError }
    ] = await Promise.all([
      supabase.from("cases").select("*"),
      supabase
        .from("actions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("*", { count: "exact", head: true })
    ])

    if (casesError) throw casesError
    if (actionsError) throw actionsError
    if (ordersError) throw ordersError

    const safeCases = cases ?? []
    const safeActions = actions ?? []

    // -----------------------------
    // DERIVED STATE
    // -----------------------------
    const activeCases = safeCases.filter(
      (c) => c.status === "open"
    )

    const resolvedCases = safeCases
      .filter((c) => c.status === "resolved")
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime()
        const bTime = new Date(b.updated_at || b.created_at).getTime()
        return bTime - aTime
      })

    // -----------------------------
    // METRICS
    // -----------------------------
    const totalCases = safeCases.length
    const resolvedCount = resolvedCases.length

    const automationRate =
      totalCases === 0
        ? 0
        : Math.round((resolvedCount / totalCases) * 100)

    const avgResolutionHours =
      resolvedCount === 0
        ? 0
        : Math.round(
            resolvedCases.reduce((acc, c) => {
              const start = new Date(c.created_at).getTime()
              const end = new Date(
                c.updated_at || c.created_at
              ).getTime()

              return acc + Math.max(0, end - start)
            }, 0) /
              resolvedCount /
              1000 /
              60 /
              60
          )

    // -----------------------------
    // IMPACT (simple v1 model)
    // -----------------------------
    const estimatedSavings = resolvedCount * 5

    // -----------------------------
    // RESPONSE
    // -----------------------------
    return NextResponse.json({
      orders: ordersCount ?? 0,

      activeCases,
      resolvedCases: resolvedCases.slice(0, 10),

      actionsList: safeActions.slice(0, 20),

      automationRate,
      avgResolutionHours,

      impact: {
        estimatedSavings,
        resolved: resolvedCount,
        prevented: resolvedCount
      }
    })
  } catch (error) {
    console.error("Dashboard API error:", error)

    return NextResponse.json(
      {
        error: "Failed to load dashboard data"
      },
      { status: 500 }
    )
  }
}
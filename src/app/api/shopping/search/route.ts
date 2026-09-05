import { NextResponse } from "next/server";
import { readPlan } from "@/lib/shopping/plan";
import { searchWeb } from "@/lib/shopping/web";
import { ShoppingError, shoppingErrorBody } from "@/lib/shopping/errors";
import { runMultiAgentPipeline } from "@/lib/agents";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = readPlan(body?.token);
    if (plan.mode === "web") {
      const web=await searchWeb(plan);
      return NextResponse.json(
        { budget: web.budget, web },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const result = await runMultiAgentPipeline(
      {
        id: crypto.randomUUID(),
        userMessage: plan.item,
        timestamp: new Date().toISOString(),
      },
      {
        priceRange: { minXrp: plan.budget.minXrp, maxXrp: plan.budget.maxXrp },
      },
    );
    return NextResponse.json(
      { budget: plan.budget, demo: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const r = shoppingErrorBody(
      e instanceof SyntaxError
        ? new ShoppingError(
            "Invalid search request.",
            "Refresh the page and retry research.",
            "INVALID_INPUT",
          )
        : e,
    );
    return NextResponse.json(r.body, { status: r.status });
  }
}

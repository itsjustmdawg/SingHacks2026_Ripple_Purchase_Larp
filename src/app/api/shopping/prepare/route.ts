import { NextResponse } from "next/server";
import { interpretPrice, convertBudget } from "@/lib/shopping/price";
import { signPlan } from "@/lib/shopping/plan";
import { ShoppingError, shoppingErrorBody } from "@/lib/shopping/errors";
export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (
      typeof b?.item !== "string" ||
      !b.item.trim() ||
      b.item.length > 1700 ||
      typeof b.pricing !== "string" ||
      b.pricing.length > 400 ||
      !["web", "demo"].includes(b.mode)
    )
      throw new ShoppingError(
        "Enter an item and a price requirement.",
        "Describe the item separately from its price, then try again.",
        "INVALID_INPUT",
      );
    const budget = await convertBudget(
      b.pricing,
      await interpretPrice(b.pricing),
    );
    const plan = {
      item: b.item.trim(),
      mode: b.mode,
      budget,
      expiresAt: Date.now() + 10 * 60000,
    };
    return NextResponse.json(
      { budget, token: signPlan(plan) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const r = shoppingErrorBody(
      e instanceof SyntaxError
        ? new ShoppingError(
            "Invalid request.",
            "Refresh the page and try again.",
            "INVALID_INPUT",
          )
        : e,
    );
    return NextResponse.json(r.body, { status: r.status });
  }
}

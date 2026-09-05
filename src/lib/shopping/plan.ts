import { createHmac, timingSafeEqual } from "node:crypto";
import type { SearchPlan } from "@/types/shopping";
import { ShoppingError } from "./errors";
function signature(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new ShoppingError(
      "Search configuration is incomplete.",
      "Ask the team to configure the session secret.",
      "CONFIGURATION",
      503,
    );
  return createHmac("sha256", secret)
    .update("shopping:" + payload)
    .digest("base64url");
}
export function signPlan(plan: SearchPlan) {
  const payload = Buffer.from(JSON.stringify(plan)).toString("base64url");
  return payload + "." + signature(payload);
}
export function readPlan(token: unknown): SearchPlan {
  try {
    if (typeof token !== "string" || token.length > 14000) throw Error();
    const [p, s, ...extra] = token.split(".");
    if (extra.length || !p || !s) throw Error();
    const expected = signature(p);
    if (
      s.length !== expected.length ||
      !timingSafeEqual(Buffer.from(s), Buffer.from(expected))
    )
      throw Error();
    const plan = JSON.parse(
      Buffer.from(p, "base64url").toString(),
    ) as SearchPlan;
    if (plan.expiresAt < Date.now()) throw Error();
    return plan;
  } catch {
    throw new ShoppingError(
      "The price preview expired or changed.",
      "Retry research to refresh the currency conversion and your price constraints.",
      "PLAN_EXPIRED",
    );
  }
}

import { describe, it, expect } from "vitest";
import { runMultiAgentPipeline } from "@/lib/agents";
import { createDevelopmentPolicyContext } from "@/lib/policy";
describe("converted demo range", () => {
  it("applies both minimum and maximum to the existing analyst", async () => {
    const r = await runMultiAgentPipeline(
      {
        id: "range-test",
        userMessage: "Find a chair",
        timestamp: new Date().toISOString(),
      },
      { model: null, priceRange: { minXrp: 4.1, maxXrp: 5 } },
    );
    expect(r.catalog.minBudgetXrp).toBe(4.1);
    for (const e of r.analysis.evaluations) {
      const o = r.catalog.offers.find((x) => x.id === e.offerId)!;
      expect(e.eligible).toBe(o.priceXrp >= 4.1 && o.priceXrp <= 5);
    }
  });
  it("does not weaken an independently denied payment policy", async () => {
    const policyContext = createDevelopmentPolicyContext();
    policyContext.budget.perTransactionLimitXrp = 3;
    const r = await runMultiAgentPipeline(
      {
        id: "range-denial",
        userMessage: "Find a chair",
        timestamp: new Date().toISOString(),
      },
      { model: null, policyContext, priceRange: { minXrp: 6, maxXrp: 10 } },
    );
    expect(r.proposal?.amount).toBeGreaterThan(5);
    expect(r.policyDecision?.approved).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { createDevelopmentPolicyContext } from "@/lib/policy";
import type { AgentRequest } from "@/types";

import { runMultiAgentPipeline } from "./orchestrator";

const NOW = new Date("2026-09-05T01:02:03.000Z");

function request(userMessage: string): AgentRequest {
  return {
    id: "multi-agent-1",
    userMessage,
    timestamp: "2026-09-05T01:00:00.000Z",
  };
}

describe("runMultiAgentPipeline", () => {
  it("scouts, compares, proposes, and authorizes in separate stages", async () => {
    const result = await runMultiAgentPipeline(
      request("Find the best encrypted cloud storage under 5 XRP"),
      { now: NOW, policyContext: createDevelopmentPolicyContext(), model: null },
    );

    expect(result.catalog.offers).toHaveLength(3);
    expect(result.analysis.selectedOffer?.provider).toBe("CloudDrop");
    expect(result.proposal).toMatchObject({
      action: "payment",
      recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
      amount: 3.8,
      currency: "XRP",
    });
    expect(result.policyDecision?.approved).toBe(true);
    expect(result.trace.map((event) => event.agent)).toEqual([
      "market_scout",
      "deal_analyst",
      "treasury",
      "policy_engine",
    ]);
    expect(result.trace[1].message).toContain("Excluded FileNet");
  });

  it("stops before treasury when no quote satisfies the user budget", async () => {
    const result = await runMultiAgentPipeline(
      request("Find cloud storage under 1 XRP"),
      { now: NOW, policyContext: createDevelopmentPolicyContext(), model: null },
    );

    expect(result.analysis.selectedOffer).toBeNull();
    expect(result.proposal).toBeNull();
    expect(result.policyDecision).toBeNull();
    expect(result.trace).toHaveLength(2);
    expect(result.trace[1]).toMatchObject({
      agent: "deal_analyst",
      status: "denied",
    });
  });

  it("lets the independent server policy deny a selected offer", async () => {
    const policyContext = createDevelopmentPolicyContext();
    policyContext.budget.perTransactionLimitXrp = 3;

    const result = await runMultiAgentPipeline(
      request("Find the best encrypted cloud storage under 5 XRP"),
      { now: NOW, policyContext, model: null },
    );

    expect(result.analysis.selectedOffer?.provider).toBe("CloudDrop");
    expect(result.policyDecision?.approved).toBe(false);
    expect(result.trace.at(-1)).toMatchObject({
      agent: "policy_engine",
      status: "denied",
    });
  });

  it("uses model-backed Scout and Analyst decisions for chair procurement", async () => {
    const model = {
      model: "gemini-test",
      async scout() {
        return {
          matchingOfferIds: [
            "furniture-ergoflow",
            "furniture-seatcraft",
            "furniture-aeronova",
          ],
          budgetXrp: 5,
          summary: "Matched three chair products.",
        };
      },
      async analyze() {
        return {
          selectedOfferId: "furniture-ergoflow",
          summary: "ErgoFlow best matches the requested chair.",
          confidence: 0.96,
        };
      },
    };
    const result = await runMultiAgentPipeline(
      request("Find the best chair under 5 XRP"),
      { now: NOW, policyContext: createDevelopmentPolicyContext(), model },
    );

    expect(result.catalog.category).toBe("furniture");
    expect(result.analysis.selectedOffer?.provider).toBe("ErgoFlow");
    expect(result.trace.slice(0, 2)).toMatchObject([
      { agent: "market_scout", engine: "gemini", model: "gemini-test" },
      { agent: "deal_analyst", engine: "gemini", model: "gemini-test" },
    ]);
  });
});

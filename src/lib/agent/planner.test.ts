import { describe, expect, it } from "vitest";

import { createDevelopmentPolicyContext } from "@/lib/policy";
import { evaluatePaymentPolicy } from "@/lib/policy/validator";
import type { AgentRequest } from "@/types";

import type { AgentDecisionModel } from "./model";
import { createPaymentProposal } from "./planner";

const ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const NOW = new Date("2026-09-05T01:02:03.000Z");

function request(userMessage: string): AgentRequest {
  return {
    id: "request-123",
    userMessage,
    timestamp: "2026-09-05T00:00:00.000Z",
  };
}

describe("createPaymentProposal", () => {
  it("extracts a complete outbound XRP payment", async () => {
    const proposal = await createPaymentProposal(
      request(`Pay 1.000001 XRP to ${ADDRESS} for market data.`),
      { now: NOW },
    );

    expect(proposal).toEqual({
      id: "proposal:request-123",
      action: "payment",
      recipient: ADDRESS,
      amount: 1.000001,
      currency: "XRP",
      reason: `The user asked to send an outbound payment of 1.000001 XRP involving ${ADDRESS} for market data.`,
      confidence: 0.95,
      createdAt: NOW.toISOString(),
    });
  });

  it("supports an amount written after the XRP symbol", async () => {
    const proposal = await createPaymentProposal(
      request(`Send XRP 4.25 to ${ADDRESS}`),
      { now: NOW },
    );

    expect(proposal.action).toBe("payment");
    expect(proposal.amount).toBe(4.25);
  });

  it("distinguishes a payment request from an outbound payment", async () => {
    const proposal = await createPaymentProposal(
      request(`Collect 3 XRP from ${ADDRESS} for lunch`),
      { now: NOW },
    );

    expect(proposal.action).toBe("request_payment");
    expect(proposal.recipient).toBe(ADDRESS);
    expect(proposal.amount).toBe(3);
  });

  it.each([
    ["missing action", `2 XRP to ${ADDRESS}`],
    ["missing recipient", "Pay 2 XRP for market data"],
    ["missing amount", `Pay the recipient ${ADDRESS}`],
    ["fractional drops", `Pay 1.0000001 XRP to ${ADDRESS}`],
  ])("returns a non-executable proposal for %s", async (_case, message) => {
    const proposal = await createPaymentProposal(request(message), {
      now: NOW,
    });

    expect(proposal.action).toBe("none");
    expect(proposal.confidence).toBe(0.25);
    expect(proposal.reason).toMatch(/^No executable payment was proposed/);
  });

  it("does not mutate the request", async () => {
    const input = request(`Tip 0.5 XRP to ${ADDRESS}`);
    const snapshot = structuredClone(input);

    await createPaymentProposal(input, { now: NOW });

    expect(input).toEqual(snapshot);
  });

  it("produces a proposal accepted by the independent development policy", async () => {
    const proposal = await createPaymentProposal(
      request(`Pay 2.5 XRP to ${ADDRESS} for product research`),
      { now: NOW },
    );
    const decision = await evaluatePaymentPolicy(
      proposal,
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(decision.approved).toBe(true);
    expect(decision.proposalId).toBe(proposal.id);
  });

  it("cannot bypass the independent human-approval threshold", async () => {
    const proposal = await createPaymentProposal(
      request(`Pay 100 XRP to ${ADDRESS} for a bulk purchase`),
      { now: NOW },
    );
    const decision = await evaluatePaymentPolicy(
      proposal,
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(decision.approved).toBe(false);
    expect(decision.requiresHumanApproval).toBe(true);
  });

  it("uses a configured model while preserving the proposal contract", async () => {
    const model: AgentDecisionModel = {
      async interpret() {
        return {
          action: "payment",
          recipient: ADDRESS,
          amount: 7,
          reason: "The model selected the requested service.",
          confidence: 0.88,
        };
      },
    };

    const proposal = await createPaymentProposal(
      request("Choose and pay for the best available service."),
      { model, now: NOW },
    );

    expect(proposal).toMatchObject({
      id: "proposal:request-123",
      action: "payment",
      recipient: ADDRESS,
      amount: 7,
      currency: "XRP",
      reason: "The model selected the requested service.",
      confidence: 0.88,
    });
  });

  it("falls back safely when the configured model is unavailable", async () => {
    const model: AgentDecisionModel = {
      async interpret() {
        throw new Error("provider unavailable");
      },
    };

    const proposal = await createPaymentProposal(
      request(`Pay 2 XRP to ${ADDRESS}`),
      { model, now: NOW },
    );

    expect(proposal).toMatchObject({
      action: "payment",
      recipient: ADDRESS,
      amount: 2,
      confidence: 0.95,
    });
  });

  it("can surface model errors when fallback is disabled", async () => {
    const model: AgentDecisionModel = {
      async interpret() {
        throw new Error("provider unavailable");
      },
    };

    await expect(
      createPaymentProposal(request("Pay for the service."), {
        model,
        fallbackOnModelError: false,
        now: NOW,
      }),
    ).rejects.toThrow("provider unavailable");
  });
});

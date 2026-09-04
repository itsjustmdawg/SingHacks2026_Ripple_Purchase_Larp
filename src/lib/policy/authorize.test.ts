import { describe, expect, it } from "vitest";

import type { PaymentProposal } from "@/types";

import { authorizePaymentProposal } from "./authorize";
import { createDevelopmentPolicyContext } from "./context";

const NOW = new Date("2026-09-05T00:00:01.000Z");
const proposal: PaymentProposal = {
  id: "proposal-123",
  action: "payment",
  recipient: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  amount: 2.5,
  currency: "XRP",
  reason: "Purchase market data.",
  confidence: 0.95,
  createdAt: "2026-09-05T00:00:00.000Z",
};

describe("authorizePaymentProposal", () => {
  it("derives the exact transaction request from an approved snapshot", async () => {
    const result = await authorizePaymentProposal(
      proposal,
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(result.authorized).toBe(true);
    if (!result.authorized) throw new Error("Expected authorization.");
    expect(result.transactionRequest).toEqual({
      proposalId: proposal.id,
      destination: proposal.recipient,
      amount: proposal.amount,
      currency: proposal.currency,
      reason: proposal.reason,
    });
  });

  it("never creates a transaction request for a denied proposal", async () => {
    const result = await authorizePaymentProposal(
      { ...proposal, amount: 100 },
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(result.authorized).toBe(false);
    expect(result.transactionRequest).toBeNull();
    expect(result.decision.requiresHumanApproval).toBe(true);
  });

  it("rejects parameter smuggling before constructing a request", async () => {
    const result = await authorizePaymentProposal(
      { ...proposal, approved: true },
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(result.authorized).toBe(false);
    expect(result.transactionRequest).toBeNull();
  });

  it("uses a detached snapshot and does not mutate the proposal", async () => {
    const original = structuredClone(proposal);
    await authorizePaymentProposal(
      proposal,
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(proposal).toEqual(original);
  });

  it("fails closed when an input cannot be safely snapshotted", async () => {
    const target = {};
    const revoked = Proxy.revocable(target, {});
    revoked.revoke();

    const result = await authorizePaymentProposal(
      revoked.proxy,
      createDevelopmentPolicyContext(),
      { now: NOW },
    );

    expect(result.authorized).toBe(false);
    expect(result.transactionRequest).toBeNull();
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import { POST } from "./route";
import * as xrplModule from "@/lib/xrpl";
import type { EscrowTransactionResult } from "@/types";

describe("Escrow API Route (/api/transaction/escrow)", () => {
  const validProposal = {
    id: "prop-escrow-123",
    action: "payment",
    recipient: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    amount: 3.5,
    currency: "XRP",
    reason: "Safe escrow procurement for cloud storage",
    confidence: 0.95,
    createdAt: "2026-09-05T00:00:00.000Z",
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body.");
  });

  it("returns 400 when creating without a proposal", async () => {
    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/proposal is required/i);
  });

  it("denies policy-violating proposals with 403", async () => {
    const submitCreate = vi.spyOn(xrplModule, "submitEscrowCreate");
    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        proposal: { ...validProposal, amount: 999999 }, // Exceeds spend limit
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toMatch(/Escrow creation denied by policy/i);
    expect(data.policyDecision.approved).toBe(false);
    expect(submitCreate).not.toHaveBeenCalled();
  });

  it("successfully authorizes and calls submitEscrowCreate for valid proposal", async () => {
    const mockResult: EscrowTransactionResult = {
      transactionId: "escrow-tx-1",
      proposalId: validProposal.id,
      status: "confirmed",
      escrowStatus: "created",
      escrowSequence: 105,
      cancelAfterIso: "2026-09-05T00:05:00.000Z",
      cancelAfterRippleTime: 841881900,
      hash: "ABC123ESCROWHASH",
      ledgerIndex: 900100,
      explorerUrl: "https://testnet.xrpl.org/transactions/ABC123ESCROWHASH",
      submittedAt: "2026-09-05T00:00:01.000Z",
      confirmedAt: "2026-09-05T00:00:05.000Z",
      error: null,
    };

    vi.spyOn(xrplModule, "submitEscrowCreate").mockResolvedValue(mockResult);

    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        proposal: validProposal,
        cancelAfterSeconds: 30,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("confirmed");
    expect(data.escrowStatus).toBe("created");
    expect(data.escrowSequence).toBe(105);
    expect(data.policyDecision.approved).toBe(true);
  });

  it("handles finish action correctly", async () => {
    const mockResult: EscrowTransactionResult = {
      transactionId: "escrow-fin-1",
      proposalId: validProposal.id,
      status: "confirmed",
      escrowStatus: "finished",
      escrowSequence: 105,
      hash: "FINISH123HASH",
      ledgerIndex: 900105,
      explorerUrl: "https://testnet.xrpl.org/transactions/FINISH123HASH",
      submittedAt: "2026-09-05T00:01:00.000Z",
      confirmedAt: "2026-09-05T00:01:04.000Z",
      error: null,
    };

    vi.spyOn(xrplModule, "submitEscrowFinish").mockResolvedValue(mockResult);

    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finish",
        proposalId: validProposal.id,
        escrowSequence: 105,
        reason: "Credentials verified",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.escrowStatus).toBe("finished");
    expect(data.hash).toBe("FINISH123HASH");
  });

  it("handles cancel action correctly", async () => {
    const mockResult: EscrowTransactionResult = {
      transactionId: "escrow-can-1",
      proposalId: validProposal.id,
      status: "confirmed",
      escrowStatus: "cancelled",
      escrowSequence: 105,
      hash: "CANCEL123HASH",
      ledgerIndex: 900110,
      explorerUrl: "https://testnet.xrpl.org/transactions/CANCEL123HASH",
      submittedAt: "2026-09-05T00:05:01.000Z",
      confirmedAt: "2026-09-05T00:05:04.000Z",
      error: null,
    };

    vi.spyOn(xrplModule, "submitEscrowCancel").mockResolvedValue(mockResult);

    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        proposalId: validProposal.id,
        escrowSequence: 105,
        reason: "Seller ghosted",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.escrowStatus).toBe("cancelled");
    expect(data.hash).toBe("CANCEL123HASH");
  });

  it("rejects finish or cancel when escrowSequence is missing", async () => {
    const request = new Request("http://localhost:3000/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finish",
        proposalId: "prop-123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/escrowSequence/i);
  });
});

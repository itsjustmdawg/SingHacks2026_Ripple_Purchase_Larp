import { describe, expect, it, vi, afterEach } from "vitest";
import { POST, GET } from "./route";
import * as xrplModule from "@/lib/xrpl";
import type { TransactionResult } from "@/types";

describe("Transaction API Routes (/api/transaction)", () => {
  const proposal = {
    id: "prop-123",
    action: "payment",
    recipient: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    amount: 10,
    currency: "XRP",
    reason: "Pay for approved infrastructure.",
    confidence: 0.95,
    createdAt: "2026-09-05T00:00:00.000Z",
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("POST /api/transaction", () => {
    it("returns 400 for invalid JSON body", async () => {
      const request = new Request("http://localhost:3000/api/transaction", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid JSON body.");
    });

    it("denies malformed proposals before XRPL submission", async () => {
      const submit = vi.spyOn(xrplModule, "submitPayment");
      const request = new Request("http://localhost:3000/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10, currency: "XRP" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Payment denied by policy.");
      expect(data.policyDecision.approved).toBe(false);
      expect(submit).not.toHaveBeenCalled();
    });

    it("does not trust a caller-authored approval or transaction request", async () => {
      const submit = vi.spyOn(xrplModule, "submitPayment");
      const request = new Request("http://localhost:3000/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: "p1",
          destination: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
          amount: 10,
          currency: "XRP",
          approved: true,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.policyDecision.approved).toBe(false);
      expect(submit).not.toHaveBeenCalled();
    });

    it("submits payment and returns 200 on confirmed result", async () => {
      const mockResult: TransactionResult = {
        transactionId: "tx-123",
        proposalId: "prop-123",
        status: "confirmed",
        hash: "A1B2C3D4",
        ledgerIndex: 12345,
        explorerUrl: "https://testnet.xrpl.org/transactions/A1B2C3D4",
        submittedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        error: null,
      };

      vi.spyOn(xrplModule, "submitPayment").mockResolvedValue(mockResult);

      const request = new Request("http://localhost:3000/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("confirmed");
      expect(data.hash).toBe("A1B2C3D4");
      expect(data.policyDecision.approved).toBe(true);
      expect(xrplModule.submitPayment).toHaveBeenCalledWith({
        proposalId: proposal.id,
        destination: proposal.recipient,
        amount: proposal.amount,
        currency: "XRP",
        reason: proposal.reason,
      });
    });

    it("returns 422 when payment submission fails on-ledger", async () => {
      const mockFailedResult: TransactionResult = {
        transactionId: "tx-fail",
        proposalId: proposal.id,
        status: "failed",
        hash: "FAIL123",
        ledgerIndex: 12345,
        explorerUrl: "https://testnet.xrpl.org/transactions/FAIL123",
        submittedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        error: "tecUNFUNDED_PAYMENT",
      };

      vi.spyOn(xrplModule, "submitPayment").mockResolvedValue(mockFailedResult);

      const request = new Request("http://localhost:3000/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });

      const response = await POST(request);
      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.status).toBe("failed");
      expect(data.error).toBe("tecUNFUNDED_PAYMENT");
    });

    it("fails closed when server policy configuration is invalid", async () => {
      vi.stubEnv("POLICY_TRANSACTION_LIMIT_XRP", "invalid");
      const submit = vi.spyOn(xrplModule, "submitPayment");
      const request = new Request("http://localhost:3000/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });

      const response = await POST(request);
      expect(response.status).toBe(503);
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/transaction", () => {
    it("returns 400 when hash query parameter is missing", async () => {
      const request = new Request("http://localhost:3000/api/transaction");
      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/hash/);
    });

    it("returns 200 with verified proof when hash is valid and confirmed", async () => {
      const mockProof: xrplModule.VerifiedTransactionDetails = {
        transactionId: "verify-123",
        proposalId: "prop-123",
        status: "confirmed",
        hash: "A1B2C3D4",
        ledgerIndex: 99999,
        explorerUrl: "https://testnet.xrpl.org/transactions/A1B2C3D4",
        submittedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        deliveredXrp: 10,
        error: null,
      };

      vi.spyOn(xrplModule, "verifyTransaction").mockResolvedValue(mockProof);

      const request = new Request("http://localhost:3000/api/transaction?hash=A1B2C3D4");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("confirmed");
      expect(data.deliveredXrp).toBe(10);
    });
  });
});

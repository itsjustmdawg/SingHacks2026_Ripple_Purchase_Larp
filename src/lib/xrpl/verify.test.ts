import { describe, expect, it, vi, afterEach } from "vitest";
import { verifyTransaction } from "./verify";
import { buildAuditMemo } from "./memo";
import * as clientModule from "./client";

describe("XRPL Transaction Verification", () => {
  const MOCK_HASH =
    "A1B2C3D4E5F60123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123";

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-64 hex transaction hashes", async () => {
    const result = await verifyTransaction("invalid-hash");
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/Invalid XRPL transaction hash/);
  });

  it("verifies a confirmed transaction with metadata and decoded audit memo", async () => {
    const memo = buildAuditMemo({
      proposalId: "prop-proof-1",
      reason: "Verified autonomous transaction",
    });

    const mockTxResponse = {
      result: {
        validated: true,
        Account: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        Destination: "rPT1Sjq2YGrBMTttX4GZHjKu9DYfzbpAYe",
        date: 810000000, // Ripple epoch date
        ledger_index: 94820192,
        Memos: [memo],
        meta: {
          TransactionResult: "tesSUCCESS",
          delivered_amount: "5000000", // 5 XRP in drops
        },
      },
    };

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue({
      request: vi.fn().mockResolvedValue(mockTxResponse),
    } as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>);

    const result = await verifyTransaction(MOCK_HASH);
    expect(result.status).toBe("confirmed");
    expect(result.hash).toBe(MOCK_HASH);
    expect(result.ledgerIndex).toBe(94820192);
    expect(result.proposalId).toBe("prop-proof-1");
    expect(result.deliveredXrp).toBe(5);
    expect(result.explorerUrl).toBe(
      `https://testnet.xrpl.org/transactions/${MOCK_HASH}`,
    );
    expect(result.auditMemo?.reason).toBe("Verified autonomous transaction");
    expect(result.error).toBeNull();
  });

  it("handles on-ledger failures (tec codes)", async () => {
    const mockTxResponse = {
      result: {
        validated: true,
        date: 810000000,
        ledger_index: 94820192,
        meta: {
          TransactionResult: "tecUNFUNDED_PAYMENT",
        },
      },
    };

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue({
      request: vi.fn().mockResolvedValue(mockTxResponse),
    } as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>);

    const result = await verifyTransaction(MOCK_HASH);
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/tecUNFUNDED_PAYMENT/);
  });

  it("handles txnNotFound by returning pending status", async () => {
    const notFoundError = new Error("txnNotFound: Transaction not found.");

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue({
      request: vi.fn().mockRejectedValue(notFoundError),
    } as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>);

    const result = await verifyTransaction(MOCK_HASH);
    expect(result.status).toBe("pending");
    expect(result.error).toMatch(/pending consensus validation/);
  });
  it("never treats a provisional success as final", async () => {
    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue({
      request: vi
        .fn()
        .mockResolvedValue({
          result: {
            validated: false,
            ledger_index: 123,
            meta: { TransactionResult: "tesSUCCESS" },
          },
        }),
    } as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>);
    const result = await verifyTransaction(MOCK_HASH);
    expect(result.status).toBe("pending");
    expect(result.ledgerIndex).toBeNull();
    expect(result.confirmedAt).toBeNull();
    expect(result.error).toContain("do not resend");
  });
});

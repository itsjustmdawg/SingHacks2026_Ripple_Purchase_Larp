import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Wallet } from "xrpl";
import { buildPaymentTransaction, submitPayment } from "./payment";
import { decodeAuditMemo } from "./memo";
import { setActiveWallet } from "./wallet";
import * as clientModule from "./client";
import { XRPL_AI_STARTER_KIT_SOURCE_TAG } from "@/config/xrpl";

describe("XRPL Payment Construction", () => {
  const SENDER = Wallet.generate().classicAddress;
  const VALID_DEST = Wallet.generate().classicAddress;

  it("constructs a valid XRPL payment object with drops, SourceTag, and audit memo", () => {
    const payment = buildPaymentTransaction(
      {
        proposalId: "prop-456",
        destination: VALID_DEST,
        amount: 15.5,
        currency: "XRP",
        reason: "Autonomous cloud compute purchase",
      },
      SENDER,
    );

    expect(payment.TransactionType).toBe("Payment");
    expect(payment.Account).toBe(SENDER);
    expect(payment.Destination).toBe(VALID_DEST);
    expect(payment.Amount).toBe("15500000"); // 15.5 * 1_000_000 drops
    expect(payment.SourceTag).toBe(XRPL_AI_STARTER_KIT_SOURCE_TAG);
    expect(payment.Memos).toBeDefined();

    const auditMemo = decodeAuditMemo(payment.Memos);
    expect(auditMemo).not.toBeNull();
    expect(auditMemo?.proposalId).toBe("prop-456");
    expect(auditMemo?.reason).toBe("Autonomous cloud compute purchase");
  });

  it("handles destinationTag when provided", () => {
    const payment = buildPaymentTransaction(
      {
        proposalId: "prop-789",
        destination: VALID_DEST,
        amount: 5,
        currency: "XRP",
        destinationTag: 12345,
      },
      SENDER,
    );

    expect(payment.DestinationTag).toBe(12345);
  });

  it("handles exact 6-decimal drop amounts without precision loss", () => {
    const payment = buildPaymentTransaction(
      {
        proposalId: "prop-micro",
        destination: VALID_DEST,
        amount: 1.000001,
        currency: "XRP",
      },
      SENDER,
    );

    expect(payment.Amount).toBe("1000001");
  });

  it("rejects invalid destination classic addresses", () => {
    expect(() =>
      buildPaymentTransaction(
        {
          proposalId: "prop-bad-dest",
          destination: "invalidAddress123",
          amount: 10,
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Invalid XRPL destination address/);
  });

  it("rejects non-positive or non-finite amounts", () => {
    expect(() =>
      buildPaymentTransaction(
        {
          proposalId: "prop-neg",
          destination: VALID_DEST,
          amount: -5,
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Payment amount must be a positive finite number/);

    expect(() =>
      buildPaymentTransaction(
        {
          proposalId: "prop-zero",
          destination: VALID_DEST,
          amount: 0,
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Payment amount must be a positive finite number/);

    expect(() =>
      buildPaymentTransaction(
        {
          proposalId: "prop-nan",
          destination: VALID_DEST,
          amount: NaN,
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Payment amount must be a positive finite number/);
  });

  it("rejects fractional drops (>6 decimal places)", () => {
    expect(() =>
      buildPaymentTransaction(
        {
          proposalId: "prop-fract",
          destination: VALID_DEST,
          amount: 0.0000001, // 7 decimals
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Invalid XRP precision/);
  });
});

describe("submitPayment Execution", () => {
  const SENDER_WALLET = Wallet.generate();
  const DEST_WALLET = Wallet.generate();

  beforeEach(() => {
    setActiveWallet(SENDER_WALLET);
  });

  afterEach(() => {
    setActiveWallet(null);
    vi.restoreAllMocks();
  });

  it("fails gracefully with structured error when destination is invalid", async () => {
    const mockClient = {
      request: vi.fn().mockResolvedValue({
        result: {
          account_data: { Account: SENDER_WALLET.classicAddress, Balance: "1000000000", OwnerCount: 0 },
        },
      }),
    };
    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>,
    );

    const result = await submitPayment({
      proposalId: "prop-invalid-addr",
      destination: "not-a-classic-address",
      amount: 10,
      currency: "XRP",
    });

    expect(result.status).toBe("failed");
    expect(result.hash).toBeNull();
    expect(result.error).toMatch(/Invalid XRPL destination address/);
  });

  it("successfully signs and submits payment when prerequisites and consensus succeed", async () => {
    const mockTx = {
      TransactionType: "Payment",
      Account: SENDER_WALLET.classicAddress,
      Destination: DEST_WALLET.classicAddress,
      Amount: "10000000",
      Fee: "12",
      Sequence: 1,
      LastLedgerSequence: 100,
    };

    const mockClient = {
      request: vi.fn().mockImplementation(async (req) => {
        if (req.account === SENDER_WALLET.classicAddress) {
          return {
            result: {
              account_data: { Account: SENDER_WALLET.classicAddress, Balance: "1000000000", OwnerCount: 0 },
            },
          };
        }
        return {
          result: {
            account_data: { Account: DEST_WALLET.classicAddress, Balance: "100000000", OwnerCount: 0 },
          },
        };
      }),
      autofill: vi.fn().mockResolvedValue(mockTx),
      submitAndWait: vi.fn().mockResolvedValue({
        result: {
          ledger_index: 94820195,
          meta: {
            TransactionResult: "tesSUCCESS",
            delivered_amount: "10000000",
          },
        },
      }),
    };

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>,
    );

    const result = await submitPayment({
      proposalId: "prop-success-1",
      destination: DEST_WALLET.classicAddress,
      amount: 10,
      currency: "XRP",
      reason: "Successful mock payment",
    });

    expect(result.status).toBe("confirmed");
    expect(result.hash).toMatch(/^[0-9A-F]{64}$/i);
    expect(result.ledgerIndex).toBe(94820195);
    expect(result.explorerUrl).toMatch(/^https:\/\/testnet\.xrpl\.org\/transactions\//);
    expect(result.error).toBeNull();
  });

  it("handles on-ledger submission failure (tec code)", async () => {
    const mockTx = {
      TransactionType: "Payment",
      Account: SENDER_WALLET.classicAddress,
      Destination: DEST_WALLET.classicAddress,
      Amount: "10000000",
      Fee: "12",
      Sequence: 1,
      LastLedgerSequence: 100,
    };

    const mockClient = {
      request: vi.fn().mockResolvedValue({
        result: {
          account_data: { Account: SENDER_WALLET.classicAddress, Balance: "1000000000", OwnerCount: 0 },
        },
      }),
      autofill: vi.fn().mockResolvedValue(mockTx),
      submitAndWait: vi.fn().mockResolvedValue({
        result: {
          ledger_index: 94820198,
          meta: {
            TransactionResult: "tecUNFUNDED_PAYMENT",
          },
        },
      }),
    };

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>,
    );

    const result = await submitPayment({
      proposalId: "prop-failed-onledger",
      destination: DEST_WALLET.classicAddress,
      amount: 10,
      currency: "XRP",
    });

    expect(result.status).toBe("failed");
    expect(result.hash).toMatch(/^[0-9A-F]{64}$/i);
    expect(result.error).toMatch(/tecUNFUNDED_PAYMENT/);
  });
});

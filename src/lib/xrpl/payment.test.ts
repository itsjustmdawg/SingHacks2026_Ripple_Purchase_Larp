import { describe, expect, it } from "vitest";
import { Wallet } from "xrpl";
import { buildPaymentTransaction } from "./payment";
import { decodeAuditMemo } from "./memo";
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

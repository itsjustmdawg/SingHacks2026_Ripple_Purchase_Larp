import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Wallet } from "xrpl";
import {
  RIPPLE_EPOCH_OFFSET,
  ESCROW_FINISH_AFTER_BUFFER_SECONDS,
  unixToRippleTime,
  rippleTimeToUnix,
  buildEscrowCreateTransaction,
  buildEscrowFinishTransaction,
  buildEscrowCancelTransaction,
  submitEscrowCreate,
  submitEscrowFinish,
  submitEscrowCancel,
} from "./escrow";
import { decodeAuditMemo } from "./memo";
import { setActiveWallet } from "./wallet";
import * as clientModule from "./client";
import { XRPL_AI_STARTER_KIT_SOURCE_TAG } from "@/config/xrpl";

describe("XRPL Escrow Epoch Utilities", () => {
  it("translates Unix seconds to Ripple epoch time accurately", () => {
    // 2000-01-01T00:00:00.000Z is 946684800 unix seconds -> 0 Ripple seconds
    expect(unixToRippleTime(946684800)).toBe(0);
    // 100 seconds later
    expect(unixToRippleTime(946684900)).toBe(100);
  });

  it("translates Ripple epoch time back to Unix seconds accurately", () => {
    expect(rippleTimeToUnix(0)).toBe(946684800);
    expect(rippleTimeToUnix(100)).toBe(946684900);
  });
});

describe("XRPL Escrow Transaction Construction", () => {
  const SENDER = Wallet.generate().classicAddress;
  const VALID_DEST = Wallet.generate().classicAddress;

  it("constructs a valid EscrowCreate transaction with drops, CancelAfter, and audit memo", () => {
    const fixedNowMs = 1700000000000; // Fixed timestamp for deterministic test
    const { tx, cancelAfterRipple, cancelAfterIso } =
      buildEscrowCreateTransaction(
        {
          proposalId: "escrow-prop-1",
          destination: VALID_DEST,
          amount: 4.5,
          currency: "XRP",
          cancelAfterSeconds: 45,
          reason: "Safe procurement escrow",
        },
        SENDER,
        fixedNowMs,
      );

    expect(tx.TransactionType).toBe("EscrowCreate");
    expect(tx.Account).toBe(SENDER);
    expect(tx.Destination).toBe(VALID_DEST);
    expect(tx.Amount).toBe("4500000"); // 4.5 * 1_000_000
    expect(tx.SourceTag).toBe(XRPL_AI_STARTER_KIT_SOURCE_TAG);

    const expectedUnixSec = Math.floor(fixedNowMs / 1000) + 45;
    expect(cancelAfterRipple).toBe(expectedUnixSec - RIPPLE_EPOCH_OFFSET);
    expect(tx.CancelAfter).toBe(cancelAfterRipple);
    expect(tx.FinishAfter).toBe(
      unixToRippleTime(Math.floor(fixedNowMs / 1000)) +
        ESCROW_FINISH_AFTER_BUFFER_SECONDS,
    );
    expect(cancelAfterIso).toBe(new Date(expectedUnixSec * 1000).toISOString());


    const memo = decodeAuditMemo(tx.Memos);
    expect(memo).not.toBeNull();
    expect(memo?.proposalId).toBe("escrow-prop-1");
    expect(memo?.action).toBe("escrow_create");
  });

  it("rejects invalid destination classic address", () => {
    expect(() =>
      buildEscrowCreateTransaction(
        {
          proposalId: "bad-dest",
          destination: "invalid-address",
          amount: 2,
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Invalid XRPL destination address/);
  });

  it("rejects non-positive amount", () => {
    expect(() =>
      buildEscrowCreateTransaction(
        {
          proposalId: "bad-amt",
          destination: VALID_DEST,
          amount: -1,
          currency: "XRP",
        },
        SENDER,
      ),
    ).toThrow(/Escrow amount must be a positive finite number/);
  });

  it("constructs a valid EscrowFinish transaction", () => {
    const finishTx = buildEscrowFinishTransaction(
      {
        proposalId: "finish-prop-1",
        escrowSequence: 123456,
        reason: "Delivered cloud storage credentials",
      },
      SENDER,
    );

    expect(finishTx.TransactionType).toBe("EscrowFinish");
    expect(finishTx.Account).toBe(SENDER);
    expect(finishTx.Owner).toBe(SENDER);
    expect(finishTx.OfferSequence).toBe(123456);
    expect(finishTx.SourceTag).toBe(XRPL_AI_STARTER_KIT_SOURCE_TAG);

    const memo = decodeAuditMemo(finishTx.Memos);
    expect(memo?.proposalId).toBe("finish-prop-1");
    expect(memo?.action).toBe("escrow_finish");
  });

  it("constructs a valid EscrowCancel transaction", () => {
    const cancelTx = buildEscrowCancelTransaction(
      {
        proposalId: "cancel-prop-1",
        escrowSequence: 654321,
        reason: "Seller non-delivery refund",
      },
      SENDER,
    );

    expect(cancelTx.TransactionType).toBe("EscrowCancel");
    expect(cancelTx.Account).toBe(SENDER);
    expect(cancelTx.Owner).toBe(SENDER);
    expect(cancelTx.OfferSequence).toBe(654321);
    expect(cancelTx.SourceTag).toBe(XRPL_AI_STARTER_KIT_SOURCE_TAG);

    const memo = decodeAuditMemo(cancelTx.Memos);
    expect(memo?.proposalId).toBe("cancel-prop-1");
    expect(memo?.action).toBe("escrow_cancel");
  });

  it("rejects invalid escrow sequence for finish or cancel", () => {
    expect(() =>
      buildEscrowFinishTransaction(
        {
          proposalId: "bad-seq",
          escrowSequence: 0,
        },
        SENDER,
      ),
    ).toThrow(/Invalid escrowSequence/);

    expect(() =>
      buildEscrowCancelTransaction(
        {
          proposalId: "bad-seq-2",
          escrowSequence: -5,
        },
        SENDER,
      ),
    ).toThrow(/Invalid escrowSequence/);
  });
});

describe("XRPL Escrow Submissions", () => {
  let mockWallet: Wallet;
  let mockClient: {
    isConnected: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    autofill: ReturnType<typeof vi.fn>;
    submitAndWait: ReturnType<typeof vi.fn>;
    request: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockWallet = Wallet.generate();
    setActiveWallet(mockWallet);

    const clientStub = {

      isConnected: vi.fn().mockReturnValue(true),
      connect: vi.fn().mockResolvedValue(undefined),
      autofill: vi.fn().mockImplementation(async (tx) => ({
        ...tx,
        Fee: "12",
        Sequence: 101,
        LastLedgerSequence: 500,
      })),
      submitAndWait: vi.fn().mockResolvedValue({
        result: {
          meta: { TransactionResult: "tesSUCCESS" },
          ledger_index: 849201,
          Sequence: 101,
        },
      }),
      request: vi.fn().mockImplementation(async (req) => {
        if (req.command === "account_info") {
          return {
            result: {
              account_data: {
                Account: mockWallet.classicAddress,
                Balance: "50000000", // 50 XRP
                OwnerCount: 0,
              },
            },
          };
        }
        return { result: {} };
      }),
    };
    mockClient = clientStub;

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue(
      clientStub as unknown as Awaited<
        ReturnType<typeof clientModule.getXrplClient>
      >,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setActiveWallet(null);
  });


  it("successfully submits EscrowCreate to the ledger", async () => {
    const dest = Wallet.generate().classicAddress;
    const result = await submitEscrowCreate({
      proposalId: "escrow-create-test",
      destination: dest,
      amount: 3,
      currency: "XRP",
      cancelAfterSeconds: 30,
    });

    expect(result.error).toBeNull();
    expect(result.status).toBe("confirmed");
    expect(result.escrowStatus).toBe("created");
    expect(result.escrowSequence).toBe(101);
    expect(result.hash).toBeDefined();
    expect(result.ledgerIndex).toBe(849201);
    expect(result.cancelAfterIso).toBeDefined();
    expect(mockClient.submitAndWait).toHaveBeenCalledTimes(1);
  });

  it("successfully submits EscrowFinish to the ledger", async () => {
    const result = await submitEscrowFinish({
      proposalId: "escrow-finish-test",
      escrowSequence: 101,
      reason: "API key received and checked",
    });

    expect(result.status).toBe("confirmed");
    expect(result.escrowStatus).toBe("finished");
    expect(result.escrowSequence).toBe(101);
    expect(result.hash).toBeDefined();
    expect(mockClient.submitAndWait).toHaveBeenCalledTimes(1);
  });

  it("successfully submits EscrowCancel to the ledger", async () => {
    const result = await submitEscrowCancel({
      proposalId: "escrow-cancel-test",
      escrowSequence: 101,
      reason: "Timeout expired, refunded",
    });

    expect(result.status).toBe("confirmed");
    expect(result.escrowStatus).toBe("cancelled");
    expect(result.escrowSequence).toBe(101);
    expect(result.hash).toBeDefined();
    expect(mockClient.submitAndWait).toHaveBeenCalledTimes(1);
  });

  it("fails EscrowCreate if wallet balance is insufficient for escrow reserve and fee", async () => {
    mockClient.request = vi.fn().mockResolvedValue({
      result: {
        account_data: {
          Account: mockWallet.classicAddress,
          Balance: "1050000", // 1.05 XRP total (1 XRP base reserve -> spendable = 0.05 XRP)
          OwnerCount: 0,
        },
      },
    });

    const result = await submitEscrowCreate({
      proposalId: "escrow-insufficient",
      destination: Wallet.generate().classicAddress,
      amount: 2,
      currency: "XRP",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/Insufficient spendable XRP for Escrow/);
  });
});

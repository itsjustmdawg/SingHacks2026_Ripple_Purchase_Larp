import {
  type EscrowCancel,
  type EscrowCreate,
  type EscrowFinish,
  isValidClassicAddress,
  xrpToDrops,
  type Client,
  type Wallet,
} from "xrpl";
import { XRPL_AI_STARTER_KIT_SOURCE_TAG, getXrplConfig } from "@/config/xrpl";
import type {
  EscrowCancelRequest,
  EscrowCreateRequest,
  EscrowFinishRequest,
  EscrowTransactionResult,
} from "@/types";

import { getXrplClient } from "./client";
import { buildAuditMemo } from "./memo";
import { getActiveWallet, getWalletInfo } from "./wallet";

/**
 * Ripple Epoch starts on 2000-01-01 00:00:00 UTC (946684800 Unix seconds).
 */
export const RIPPLE_EPOCH_OFFSET = 946684800;
export const DEFAULT_CANCEL_AFTER_SECONDS = 300; // 5 minutes standard
export const PITCH_DEMO_CANCEL_AFTER_SECONDS = 30; // 30 seconds for live pitch demo

export function unixToRippleTime(unixSeconds: number): number {
  return Math.floor(unixSeconds) - RIPPLE_EPOCH_OFFSET;
}

export function rippleTimeToUnix(rippleSeconds: number): number {
  return rippleSeconds + RIPPLE_EPOCH_OFFSET;
}

/**
 * Builds an unsigned XRPL EscrowCreate transaction object.
 * FinishAfter is given a 5-second forward cushion so it is strictly in the future
 * when ledger consensus closes, preventing tecNO_PERMISSION.
 */
export function buildEscrowCreateTransaction(
  request: EscrowCreateRequest,
  senderAddress: string,
  baseTime?: number,
): { tx: EscrowCreate; cancelAfterRipple: number; cancelAfterIso: string } {
  if (!request.destination || !isValidClassicAddress(request.destination)) {
    throw new Error(
      `Invalid XRPL destination address: "${request.destination}". Must be a valid classic address.`,
    );
  }

  if (
    typeof request.amount !== "number" ||
    !Number.isFinite(request.amount) ||
    request.amount <= 0
  ) {
    throw new Error(
      `Escrow amount must be a positive finite number. Received: ${request.amount}`,
    );
  }

  let dropsAmount: string;
  try {
    dropsAmount = xrpToDrops(request.amount.toString());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid XRP precision: ${msg}`);
  }

  const cancelSeconds = Math.max(
    10,
    request.cancelAfterSeconds ?? DEFAULT_CANCEL_AFTER_SECONDS,
  );

  const currentRippleSec =
    baseTime !== undefined
      ? baseTime > 1_000_000_000_000
        ? unixToRippleTime(Math.floor(baseTime / 1000))
        : baseTime
      : unixToRippleTime(Math.floor(Date.now() / 1000));

  // In XRPL EscrowCreate, FinishAfter MUST be strictly in the future when consensus closes.
  const finishAfterRipple = currentRippleSec + 5;
  const cancelAfterRipple = Math.max(
    finishAfterRipple + 5,
    currentRippleSec + cancelSeconds,
  );
  const cancelAfterIso = new Date(
    rippleTimeToUnix(cancelAfterRipple) * 1000,
  ).toISOString();

  const memo = buildAuditMemo({
    proposalId: request.proposalId,
    reason:
      request.reason ||
      `XRPL Escrow Safe for proposal ${request.proposalId} (expires in ${cancelSeconds}s)`,
    action: "escrow_create",
  });

  const tx: EscrowCreate = {
    TransactionType: "EscrowCreate",
    Account: senderAddress,
    Destination: request.destination,
    Amount: dropsAmount,
    FinishAfter: finishAfterRipple,
    CancelAfter: cancelAfterRipple,
    SourceTag: XRPL_AI_STARTER_KIT_SOURCE_TAG,
    Memos: [memo],
  };

  return { tx, cancelAfterRipple, cancelAfterIso };
}


/**
 * Builds an unsigned XRPL EscrowFinish transaction object.
 */
export function buildEscrowFinishTransaction(
  request: EscrowFinishRequest,
  senderAddress: string,
): EscrowFinish {
  if (
    typeof request.escrowSequence !== "number" ||
    !Number.isInteger(request.escrowSequence) ||
    request.escrowSequence <= 0
  ) {
    throw new Error(
      `Invalid escrowSequence: ${request.escrowSequence}. Must be a positive integer.`,
    );
  }

  const owner = request.ownerAddress || senderAddress;
  if (!isValidClassicAddress(owner)) {
    throw new Error(
      `Invalid escrow owner address: "${owner}". Must be a valid classic address.`,
    );
  }

  const memo = buildAuditMemo({
    proposalId: request.proposalId,
    reason:
      request.reason ||
      `Fulfillment confirmed for escrow #${request.escrowSequence}`,
    action: "escrow_finish",
  });

  return {
    TransactionType: "EscrowFinish",
    Account: senderAddress,
    Owner: owner,
    OfferSequence: request.escrowSequence,
    SourceTag: XRPL_AI_STARTER_KIT_SOURCE_TAG,
    Memos: [memo],
  };
}

/**
 * Builds an unsigned XRPL EscrowCancel transaction object.
 */
export function buildEscrowCancelTransaction(
  request: EscrowCancelRequest,
  senderAddress: string,
): EscrowCancel {
  if (
    typeof request.escrowSequence !== "number" ||
    !Number.isInteger(request.escrowSequence) ||
    request.escrowSequence <= 0
  ) {
    throw new Error(
      `Invalid escrowSequence: ${request.escrowSequence}. Must be a positive integer.`,
    );
  }

  const owner = request.ownerAddress || senderAddress;
  if (!isValidClassicAddress(owner)) {
    throw new Error(
      `Invalid escrow owner address: "${owner}". Must be a valid classic address.`,
    );
  }

  const memo = buildAuditMemo({
    proposalId: request.proposalId,
    reason:
      request.reason ||
      `Auto-refund cancellation for expired escrow #${request.escrowSequence}`,
    action: "escrow_cancel",
  });

  return {
    TransactionType: "EscrowCancel",
    Account: senderAddress,
    Owner: owner,
    OfferSequence: request.escrowSequence,
    SourceTag: XRPL_AI_STARTER_KIT_SOURCE_TAG,
    Memos: [memo],
  };
}

/**
 * Pre-flight safety check for creating an escrow.
 */
export async function validateEscrowPrerequisites(
  senderWallet: Wallet,
  request: EscrowCreateRequest,
): Promise<{ passed: boolean }> {
  const senderInfo = await getWalletInfo(senderWallet.classicAddress);

  if (!senderInfo.isFunded) {
    throw new Error(
      `Sender account ${senderWallet.classicAddress} is not funded on the ledger.`,
    );
  }

  // Reserve impact: Escrow requires an owner reserve entry (~0.2 XRP on Testnet) + network fee
  const reserveAndFee = 0.201;
  const totalRequired = request.amount + reserveAndFee;

  if (senderInfo.spendableXrp < totalRequired) {
    throw new Error(
      `Insufficient spendable XRP for Escrow. Required: ${totalRequired.toFixed(4)} XRP (amount + 0.2 XRP escrow reserve + fee). Available: ${senderInfo.spendableXrp.toFixed(4)} XRP.`,
    );
  }

  return { passed: true };
}

/**
 * Submits an EscrowCreate transaction to XRPL Testnet.
 */
export async function submitEscrowCreate(
  request: EscrowCreateRequest,
  nowEpochMs = Date.now(),
): Promise<EscrowTransactionResult> {
  const transactionId = `escrow-create-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const config = getXrplConfig();

  let client: Client;
  let wallet: Wallet;

  try {
    client = await getXrplClient();
    wallet = await getActiveWallet();
  } catch (initErr) {
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      hash: null,
      ledgerIndex: null,
      explorerUrl: null,
      submittedAt: null,
      confirmedAt: null,
      error: `Failed to initialize XRPL client or agent wallet: ${initErr instanceof Error ? initErr.message : String(initErr)}`,
    };
  }

  try {
    await validateEscrowPrerequisites(wallet, request);
  } catch (preflightErr) {
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      hash: null,
      ledgerIndex: null,
      explorerUrl: null,
      submittedAt: null,
      confirmedAt: null,
      error:
        preflightErr instanceof Error
          ? preflightErr.message
          : String(preflightErr),
    };
  }

  let signedHash: string | null = null;
  let submittedAt: string | null = null;

  try {

    let liveLedgerRippleTime: number | undefined;

    try {
      const ledgerRes = await client.request({
        command: "ledger",
        ledger_index: "validated",
      });
      const closeTime = (ledgerRes.result as { ledger?: { close_time?: number } }).ledger?.close_time;
      if (typeof closeTime === "number") {
        liveLedgerRippleTime = closeTime;
      }
    } catch {
      // Graceful fallback to nowEpochMs if ledger command is mocked or unavailable
    }

    const { tx, cancelAfterRipple, cancelAfterIso } =
      buildEscrowCreateTransaction(
        request,
        wallet.classicAddress,
        liveLedgerRippleTime ?? nowEpochMs,
      );
    const autofilled = await client.autofill(tx);

    const signed = wallet.sign(autofilled);
    signedHash = signed.hash;
    submittedAt = new Date().toISOString();

    const response = await client.submitAndWait(signed.tx_blob);
    const result = response.result;
    const meta = result.meta;

    const txResultCode =
      typeof meta === "object" && meta !== null && "TransactionResult" in meta
        ? (meta.TransactionResult as string)
        : "unknown";

    const ledgerIndex =
      typeof result.ledger_index === "number" ? result.ledger_index : null;
    const explorerUrl = `${config.explorerTxBaseUrl}${signedHash}`;
    const confirmedAt = new Date().toISOString();

    const escrowSequence =
      typeof autofilled.Sequence === "number"
        ? autofilled.Sequence
        : typeof (result as { tx_json?: { Sequence?: number } }).tx_json?.Sequence === "number"
          ? (result as { tx_json?: { Sequence?: number } }).tx_json!.Sequence!
          : (result as { Sequence?: number }).Sequence ?? null;


    if (txResultCode === "tesSUCCESS") {
      return {
        transactionId,
        proposalId: request.proposalId,
        status: "confirmed",
        escrowStatus: "created",
        escrowSequence,
        cancelAfterIso,
        cancelAfterRippleTime: cancelAfterRipple,
        hash: signedHash,
        ledgerIndex,
        explorerUrl,
        submittedAt,
        confirmedAt,
        error: null,
      };
    }

    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      hash: signedHash,
      ledgerIndex,
      explorerUrl,
      submittedAt,
      confirmedAt,
      error: `XRPL EscrowCreate failed on-ledger with result code: ${txResultCode}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      hash: signedHash,
      ledgerIndex: null,
      explorerUrl: signedHash
        ? `${config.explorerTxBaseUrl}${signedHash}`
        : null,
      submittedAt,
      confirmedAt: null,
      error: `Escrow creation failed: ${message}`,
    };
  }
}

/**
 * Submits an EscrowFinish transaction to release funds to the recipient.
 */
export async function submitEscrowFinish(
  request: EscrowFinishRequest,
): Promise<EscrowTransactionResult> {
  const transactionId = `escrow-finish-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const config = getXrplConfig();

  let client: Client;
  let wallet: Wallet;

  try {
    client = await getXrplClient();
    wallet = await getActiveWallet();
  } catch (initErr) {
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      hash: null,
      ledgerIndex: null,
      explorerUrl: null,
      submittedAt: null,
      confirmedAt: null,
      error: `Failed to initialize XRPL client or agent wallet: ${initErr instanceof Error ? initErr.message : String(initErr)}`,
    };
  }

  let signedHash: string | null = null;
  let submittedAt: string | null = null;

  try {
    const tx = buildEscrowFinishTransaction(request, wallet.classicAddress);
    const autofilled = await client.autofill(tx);

    const signed = wallet.sign(autofilled);
    signedHash = signed.hash;
    submittedAt = new Date().toISOString();

    const response = await client.submitAndWait(signed.tx_blob);
    const result = response.result;
    const meta = result.meta;

    const txResultCode =
      typeof meta === "object" && meta !== null && "TransactionResult" in meta
        ? (meta.TransactionResult as string)
        : "unknown";

    const ledgerIndex =
      typeof result.ledger_index === "number" ? result.ledger_index : null;
    const explorerUrl = `${config.explorerTxBaseUrl}${signedHash}`;
    const confirmedAt = new Date().toISOString();

    if (txResultCode === "tesSUCCESS") {
      return {
        transactionId,
        proposalId: request.proposalId,
        status: "confirmed",
        escrowStatus: "finished",
        escrowSequence: request.escrowSequence,
        hash: signedHash,
        ledgerIndex,
        explorerUrl,
        submittedAt,
        confirmedAt,
        error: null,
      };
    }

    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      escrowSequence: request.escrowSequence,
      hash: signedHash,
      ledgerIndex,
      explorerUrl,
      submittedAt,
      confirmedAt,
      error: `XRPL EscrowFinish failed on-ledger with result code: ${txResultCode}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      escrowSequence: request.escrowSequence,
      hash: signedHash,
      ledgerIndex: null,
      explorerUrl: signedHash
        ? `${config.explorerTxBaseUrl}${signedHash}`
        : null,
      submittedAt,
      confirmedAt: null,
      error: `Escrow release failed: ${message}`,
    };
  }
}

/**
 * Submits an EscrowCancel transaction to reclaim funds after expiry.
 */
export async function submitEscrowCancel(
  request: EscrowCancelRequest,
): Promise<EscrowTransactionResult> {
  const transactionId = `escrow-cancel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const config = getXrplConfig();

  let client: Client;
  let wallet: Wallet;

  try {
    client = await getXrplClient();
    wallet = await getActiveWallet();
  } catch (initErr) {
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      hash: null,
      ledgerIndex: null,
      explorerUrl: null,
      submittedAt: null,
      confirmedAt: null,
      error: `Failed to initialize XRPL client or agent wallet: ${initErr instanceof Error ? initErr.message : String(initErr)}`,
    };
  }

  let signedHash: string | null = null;
  let submittedAt: string | null = null;

  try {
    const tx = buildEscrowCancelTransaction(request, wallet.classicAddress);
    const autofilled = await client.autofill(tx);

    const signed = wallet.sign(autofilled);
    signedHash = signed.hash;
    submittedAt = new Date().toISOString();

    const response = await client.submitAndWait(signed.tx_blob);
    const result = response.result;
    const meta = result.meta;

    const txResultCode =
      typeof meta === "object" && meta !== null && "TransactionResult" in meta
        ? (meta.TransactionResult as string)
        : "unknown";

    const ledgerIndex =
      typeof result.ledger_index === "number" ? result.ledger_index : null;
    const explorerUrl = `${config.explorerTxBaseUrl}${signedHash}`;
    const confirmedAt = new Date().toISOString();

    if (txResultCode === "tesSUCCESS") {
      return {
        transactionId,
        proposalId: request.proposalId,
        status: "confirmed",
        escrowStatus: "cancelled",
        escrowSequence: request.escrowSequence,
        hash: signedHash,
        ledgerIndex,
        explorerUrl,
        submittedAt,
        confirmedAt,
        error: null,
      };
    }

    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      escrowSequence: request.escrowSequence,
      hash: signedHash,
      ledgerIndex,
      explorerUrl,
      submittedAt,
      confirmedAt,
      error: `XRPL EscrowCancel failed on-ledger with result code: ${txResultCode}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      transactionId,
      proposalId: request.proposalId,
      status: "failed",
      escrowStatus: "failed",
      escrowSequence: request.escrowSequence,
      hash: signedHash,
      ledgerIndex: null,
      explorerUrl: signedHash
        ? `${config.explorerTxBaseUrl}${signedHash}`
        : null,
      submittedAt,
      confirmedAt: null,
      error: `Escrow cancellation failed: ${message}`,
    };
  }
}

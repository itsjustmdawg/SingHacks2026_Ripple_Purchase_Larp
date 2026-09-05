import { dropsToXrp } from "xrpl";
import { getXrplConfig } from "@/config/xrpl";
import { getXrplClient } from "./client";
import { decodeAuditMemo, type AgentAuditMemoData } from "./memo";
import type { TransactionResult } from "@/types";

const RIPPLE_EPOCH_OFFSET = 946684800; // Offset between Unix epoch and Ripple epoch (seconds)

export interface VerifiedTransactionDetails extends TransactionResult {
  sender?: string;
  destination?: string;
  deliveredXrp?: number;
  auditMemo?: AgentAuditMemoData | null;
}

/**
 * Verifies a submitted transaction directly against the XRP Ledger.
 * Queries the validated ledger by transaction hash, extracts execution metadata,
 * calculates delivered amount, decodes audit memos, and returns verifiable proof.
 */
export async function verifyTransaction(
  hash: string,
): Promise<VerifiedTransactionDetails> {
  const cleanHash = hash.trim().toUpperCase();
  const config = getXrplConfig();
  const explorerUrl = `${config.explorerTxBaseUrl}${cleanHash}`;

  if (!/^[0-9A-F]{64}$/i.test(cleanHash)) {
    return {
      transactionId: `verify-${cleanHash}`,
      proposalId: "unknown",
      status: "failed",
      hash: cleanHash,
      ledgerIndex: null,
      explorerUrl: null,
      submittedAt: null,
      confirmedAt: null,
      error: `Invalid XRPL transaction hash: "${hash}". Must be a 64-character hex string.`,
    };
  }

  try {
    const client = await getXrplClient();
    const response = await client.request({
      command: "tx",
      transaction: cleanHash,
    });

    const txData = response.result;
    const meta = txData.meta;

    const txResultCode =
      typeof meta === "object" && meta !== null && "TransactionResult" in meta
        ? (meta.TransactionResult as string)
        : "unknown";

    const ledgerIndex =
      typeof txData.ledger_index === "number" ? txData.ledger_index : null;

    // Convert Ripple epoch seconds to ISO timestamp
    let confirmedAt: string | null = null;
    if (typeof txData.date === "number") {
      confirmedAt = new Date(
        (txData.date + RIPPLE_EPOCH_OFFSET) * 1000,
      ).toISOString();
    }

    const txDetails = (
      "tx_json" in txData && txData.tx_json ? txData.tx_json : txData
    ) as Record<string, unknown>;

    // Decode audit memo if present
    const auditMemo = decodeAuditMemo(txDetails.Memos);
    const proposalId = auditMemo?.proposalId || "verified-on-ledger";

    // Extract delivered amount in XRP
    let deliveredXrp: number | undefined;
    if (
      typeof meta === "object" &&
      meta !== null &&
      "delivered_amount" in meta
    ) {
      const delivered = (meta as { delivered_amount: unknown })
        .delivered_amount;
      if (typeof delivered === "string") {
        try {
          deliveredXrp = Number(dropsToXrp(delivered));
        } catch {
          // Keep undefined if non-XRP string
        }
      }
    }

    const validated = txData.validated === true;
    const isConfirmed = validated && txResultCode === "tesSUCCESS";

    return {
      transactionId: `verify-${cleanHash}`,
      proposalId,
      status: !validated ? "pending" : isConfirmed ? "confirmed" : "failed",
      hash: cleanHash,
      ledgerIndex: validated ? ledgerIndex : null,
      explorerUrl,
      submittedAt: confirmedAt,
      confirmedAt: validated ? confirmedAt : null,
      deliveredXrp,
      sender:
        typeof txDetails.Account === "string" ? txDetails.Account : undefined,
      destination:
        typeof txDetails.Destination === "string"
          ? txDetails.Destination
          : undefined,
      auditMemo,
      escrowSequence:
        txDetails.TransactionType === "EscrowCreate" &&
        typeof txDetails.Sequence === "number"
          ? txDetails.Sequence
          : typeof txDetails.OfferSequence === "number"
            ? txDetails.OfferSequence
            : undefined,
      cancelAfterIso:
        typeof txDetails.CancelAfter === "number"
          ? new Date(
              (txDetails.CancelAfter + RIPPLE_EPOCH_OFFSET) * 1000,
            ).toISOString()
          : undefined,
      error: !validated
        ? "Transaction is not in a validated ledger yet. Retry the status check; do not resend the payment."
        : isConfirmed
          ? null
          : `Transaction executed on-ledger with failure result: ${txResultCode}`,
    };
  } catch (error: unknown) {
    const errorStr = String(error);
    const isNotFound =
      errorStr.includes("txnNotFound") ||
      errorStr.includes("Transaction not found");

    return {
      transactionId: `verify-${cleanHash}`,
      proposalId: "unknown",
      status: isNotFound ? "pending" : "failed",
      hash: cleanHash,
      ledgerIndex: null,
      explorerUrl,
      submittedAt: null,
      confirmedAt: null,
      error: isNotFound
        ? "Transaction not yet found on the XRP Ledger. It may be pending consensus validation."
        : `Verification query failed: ${error instanceof Error ? error.message : errorStr}`,
    };
  }
}

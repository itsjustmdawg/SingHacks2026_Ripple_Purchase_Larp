import {
  type Payment,
  xrpToDrops,
  isValidClassicAddress,
  type Client,
  type Wallet,
} from "xrpl";
import { XRPL_AI_STARTER_KIT_SOURCE_TAG } from "@/config/xrpl";
import { buildAuditMemo } from "./memo";
import { getWalletInfo } from "./wallet";
import type { TransactionRequest, TransactionResult } from "@/types";
import { NotImplementedError } from "@/lib/utils";

export interface ExtendedTransactionRequest extends TransactionRequest {
  reason?: string;
  destinationTag?: number;
}

/**
 * Validates transaction request parameters and builds an unsigned XRPL Payment transaction object.
 * Embeds agent SourceTag and on-chain audit Memo.
 */
export function buildPaymentTransaction(
  request: ExtendedTransactionRequest,
  senderAddress: string,
): Payment {
  if (!request.destination || !isValidClassicAddress(request.destination)) {
    throw new Error(
      `Invalid XRPL destination address: "${request.destination}". Must be a valid classic address.`,
    );
  }

  if (typeof request.amount !== "number" || !Number.isFinite(request.amount) || request.amount <= 0) {
    throw new Error(`Payment amount must be a positive finite number. Received: ${request.amount}`);
  }

  let dropsAmount: string;
  try {
    dropsAmount = xrpToDrops(request.amount.toString());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid XRP precision: ${msg}`);
  }

  const memo = buildAuditMemo({
    proposalId: request.proposalId,
    reason: request.reason || `Payment for proposal ${request.proposalId}`,
    action: "payment",
  });

  const payment: Payment = {
    TransactionType: "Payment",
    Account: senderAddress,
    Destination: request.destination,
    Amount: dropsAmount,
    SourceTag: XRPL_AI_STARTER_KIT_SOURCE_TAG,
    Memos: [memo],
  };

  if (typeof request.destinationTag === "number") {
    payment.DestinationTag = request.destinationTag;
  }

  return payment;
}

/**
 * Performs pre-flight checks against the live ledger before signing:
 * 1. Checks sender spendable balance including network fee cushion.
 * 2. Checks if destination exists; if not, requires minimum 1 XRP base reserve.
 * 3. Checks if destination requires a DestinationTag.
 */
export async function validatePaymentPrerequisites(
  client: Client,
  senderWallet: Wallet,
  request: ExtendedTransactionRequest,
): Promise<{ passed: boolean; warnings?: string[] }> {
  const senderInfo = await getWalletInfo(senderWallet.classicAddress);

  if (!senderInfo.isFunded) {
    throw new Error(
      `Sender account ${senderWallet.classicAddress} is not funded on the ledger. Fund via faucet first.`,
    );
  }

  // Estimated network fee: ~0.000012 XRP (12 drops)
  const estimatedFeeXrp = 0.0001;
  const totalRequiredXrp = request.amount + estimatedFeeXrp;

  if (senderInfo.spendableXrp < totalRequiredXrp) {
    throw new Error(
      `Insufficient spendable XRP. Required: ${totalRequiredXrp} XRP (including reserve & fee), available spendable: ${senderInfo.spendableXrp} XRP (balance: ${senderInfo.balanceXrp} XRP, locked in reserve: ${senderInfo.reservedXrp} XRP).`,
    );
  }

  // Inspect destination account
  try {
    const destResponse = await client.request({
      command: "account_info",
      account: request.destination,
      ledger_index: "validated",
    });

    const flags = destResponse.result.account_data.Flags ?? 0;
    // XRPL account-root flag: lsfRequireDestTag = 0x00020000
    const LSF_REQUIRE_DEST_TAG = 0x00020000;
    const requiresTag = (flags & LSF_REQUIRE_DEST_TAG) !== 0;

    if (requiresTag && request.destinationTag === undefined) {
      throw new Error(
        `Destination account ${request.destination} requires a DestinationTag (lsfRequireDestTag flag is set).`,
      );
    }
  } catch (error: unknown) {
    const errorStr = String(error);
    if (errorStr.includes("actNotFound") || errorStr.includes("Account not found")) {
      // Account does not exist on-ledger: requires account activation (minimum 1 XRP)
      if (request.amount < 1) {
        throw new Error(
          `Destination account ${request.destination} is not yet activated on-ledger. The XRP Ledger requires a minimum payment of 1 XRP to create and activate a new account (base reserve).`,
        );
      }
    } else {
      throw error;
    }
  }

  return { passed: true };
}

/**
 * Submits a policy-approved request to XRPL.
 * Signing and submission execution logic is scheduled for Phase 4.
 */
export async function submitPayment(
  request: TransactionRequest,
): Promise<TransactionResult> {
  void request;
  throw new NotImplementedError(
    "XRPL payment submission is not implemented. No transaction was signed or submitted.",
  );
}

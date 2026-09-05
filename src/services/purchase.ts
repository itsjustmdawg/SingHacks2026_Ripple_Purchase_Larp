import type {
  MultiAgentPipelineResult,
  PaymentProposal,
  TransactionResult,
  PolicyDecision,
  EscrowTransactionResult,
} from "@/types";
import type { VendorDeliveryReceipt } from "@/lib/catalog";

export type { EscrowTransactionResult, VendorDeliveryReceipt };
export interface WalletView {
  address: string;
  balanceXrp: number;
  spendableXrp: number;
  reservedXrp: number;
  ownerCount: number;
  isFunded: boolean;
}
export interface Receipt extends TransactionResult {
  objective: string;
  provider: string;
  amount: number;
  policyDecision?: PolicyDecision;
}
export class RequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new RequestError(
      body.error || "The request could not be completed.",
      response.status,
    );
  return body as T;
}
export const purchaseService = {
  wallet: () => api<WalletView>("/api/wallet"),
  analyze: (objective: string) =>
    api<MultiAgentPipelineResult>("/api/agents/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        userMessage: objective,
        timestamp: new Date().toISOString(),
      }),
    }),
  submit: async (
    proposal: PaymentProposal,
  ): Promise<TransactionResult & { policyDecision: PolicyDecision }> => {
    const response = await fetch("/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal),
    });
    const body = await response.json();
    if (
      !response.ok &&
      !(
        response.status === 422 &&
        typeof body.transactionId === "string" &&
        ["failed", "pending", "submitted"].includes(body.status)
      )
    )
      throw new RequestError(
        body.error || "The payment could not be completed.",
        response.status,
      );
    return body;
  },
  verify: (hash: string) =>
    api<TransactionResult>(
      "/api/transaction/verify?hash=" + encodeURIComponent(hash),
    ),
  lockEscrow: async (
    proposal: PaymentProposal,
    cancelAfterSeconds = 30,
  ): Promise<EscrowTransactionResult & { policyDecision?: PolicyDecision }> => {
    const response = await fetch("/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        proposal,
        cancelAfterSeconds,
        reason: proposal.reason,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new RequestError(
        body.error || "Failed to lock escrow on XRPL.",
        response.status,
      );
    }
    return body;
  },
  releaseEscrow: async (
    proposalId: string,
    escrowSequence: number,
    reason?: string,
  ): Promise<EscrowTransactionResult> => {
    const response = await fetch("/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finish",
        proposalId,
        escrowSequence,
        reason: reason || `Service verified for proposal ${proposalId}`,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new RequestError(
        body.error || "Failed to release escrow on XRPL.",
        response.status,
      );
    }
    return body;
  },
  cancelEscrow: async (
    proposalId: string,
    escrowSequence: number,
    reason?: string,
  ): Promise<EscrowTransactionResult> => {
    const response = await fetch("/api/transaction/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel",
        proposalId,
        escrowSequence,
        reason: reason || "Seller non-delivery or cancellation guarantee.",
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new RequestError(
        body.error || "Failed to cancel escrow on XRPL.",
        response.status,
      );
    }
    return body;
  },
  deliver: async (
    offerId: string,
    simulateGhosting = false,
  ): Promise<VendorDeliveryReceipt> => {
    const response = await fetch("/api/catalog/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, simulateGhosting }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new RequestError(
        body.error || "Failed to fetch delivery receipt.",
        response.status,
      );
    }
    return body as VendorDeliveryReceipt;
  },
};
const RECEIPTS_KEY = "purchase-larp-receipts-v1";
export function getReceipts(): Receipt[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECEIPTS_KEY) || "[]");
    return Array.isArray(raw)
      ? raw
          .filter(
            (x) =>
              typeof x?.transactionId === "string" &&
              typeof x?.objective === "string" &&
              typeof x?.amount === "number" &&
              ["confirmed", "failed", "pending", "submitted"].includes(
                x?.status,
              ),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function saveReceipt(receipt: Receipt) {
  try {
    const list = getReceipts().filter(
      (x) => x.transactionId !== receipt.transactionId,
    );
    localStorage.setItem(
      RECEIPTS_KEY,
      JSON.stringify([receipt, ...list].slice(0, 50)),
    );
    return true;
  } catch {
    return false;
  }
}
export function formatXrp(amount: number) {
  return new Intl.NumberFormat("en-SG", { maximumFractionDigits: 6 }).format(
    amount,
  );
}

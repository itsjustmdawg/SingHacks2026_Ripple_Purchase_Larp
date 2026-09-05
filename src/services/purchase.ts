import type {
  MultiAgentPipelineResult,
  PaymentProposal,
  TransactionResult,
  PolicyDecision,
} from "@/types";
export interface WalletView {
  address: string;
  balanceXrp: number;
  spendableXrp: number;
  reservedXrp: number;
  ownerCount: number;
  isFunded: boolean;
}
export interface Receipt extends TransactionResult {
  walletAddress?: string;
  objective: string;
  provider: string;
  amount: number;
  policyDecision?: PolicyDecision;
}
export class RequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly nextStep: string = "Retry shortly. If this persists, check your connection and sign in again.",
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(60000),
    });
  } catch {
    throw new RequestError("The server could not be reached or timed out.", 0);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new RequestError(
      "The server returned an unreadable response.",
      response.status,
      "Retry the research request. For payments, check ledger status before doing anything else.",
    );
  }
  if (!response.ok)
    throw new RequestError(
      body.error || "The request could not be completed.",
      response.status,
      body.nextStep,
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
  verify: async (hash: string): Promise<TransactionResult> => {
    const response = await fetch(
      "/api/transaction/verify?hash=" + encodeURIComponent(hash),
      { cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    const body = await response.json();
    if (
      (response.ok || response.status === 404) &&
      typeof body.transactionId === "string" &&
      ["confirmed", "failed", "pending", "submitted"].includes(body.status)
    )
      return body;
    throw new RequestError(
      body.error || "Verification unavailable.",
      response.status,
    );
  },
};
const PENDING_KEY = "purchase-larp-pending-payment-v1";
export function savePendingPayment(receipt: Receipt) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(receipt));
    return true;
  } catch {
    return false;
  }
}
export function clearPendingPayment() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* UI still prevents automatic retries. */
  }
}
export function getPendingPayment(): Receipt | null {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    return value &&
      typeof value.transactionId === "string" &&
      typeof value.amount === "number" &&
      typeof value.proposalId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
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

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

import type { SupportedCurrency } from "./agent";

export interface TransactionRequest {
  proposalId: string;
  destination: string;
  amount: number;
  currency: SupportedCurrency;
}

export type TransactionStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "failed";

export interface TransactionResult {
  transactionId: string;
  proposalId: string;
  status: TransactionStatus;
  hash: string | null;
  ledgerIndex: number | null;
  explorerUrl: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  error: string | null;
}

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

export type EscrowAction = "create" | "finish" | "cancel";

export type EscrowStatus =
  | "created"
  | "delivery_pending"
  | "finished"
  | "cancelled"
  | "failed";

export interface EscrowCreateRequest {
  proposalId: string;
  destination: string;
  amount: number;
  currency: SupportedCurrency;
  cancelAfterSeconds?: number;
  reason?: string;
}

export interface EscrowFinishRequest {
  proposalId: string;
  escrowSequence: number;
  ownerAddress?: string;
  reason?: string;
}

export interface EscrowCancelRequest {
  proposalId: string;
  escrowSequence: number;
  ownerAddress?: string;
  reason?: string;
}

export interface EscrowTransactionResult extends TransactionResult {
  escrowSequence?: number | null;
  cancelAfterIso?: string | null;
  cancelAfterRippleTime?: number | null;
  escrowStatus?: EscrowStatus;
}


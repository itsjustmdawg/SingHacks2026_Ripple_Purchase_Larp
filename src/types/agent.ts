import type { PolicyDecision } from "./policy";
import type { TransactionResult } from "./transaction";

export interface AgentRequest {
  id: string;
  userMessage: string;
  timestamp: string;
}

export type PaymentAction = "payment" | "request_payment" | "none";

export type SupportedCurrency = "XRP";

export interface PaymentProposal {
  id: string;
  action: PaymentAction;
  recipient: string;
  amount: number;
  currency: SupportedCurrency;
  reason: string;
  confidence: number;
  createdAt: string;
}

export type AgentExecutionStatus =
  | "received"
  | "proposed"
  | "rejected"
  | "approved"
  | "submitted"
  | "confirmed"
  | "failed";

export interface AgentExecution {
  id: string;
  request: AgentRequest;
  proposal: PaymentProposal | null;
  policyDecision: PolicyDecision | null;
  transaction: TransactionResult | null;
  status: AgentExecutionStatus;
  createdAt: string;
  updatedAt: string;
}

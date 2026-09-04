import type {
  PaymentProposal,
  PolicyDecision,
  TransactionRequest,
} from "@/types";

import {
  evaluatePaymentPolicy,
  type PolicyEvaluationOptions,
} from "./validator";

/** Exact approved payment data handed to XRPL, including its audit reason. */
export interface AuthorizedTransactionRequest extends TransactionRequest {
  reason: string;
}

export type PaymentAuthorizationResult =
  | {
      authorized: true;
      decision: PolicyDecision;
      transactionRequest: AuthorizedTransactionRequest;
    }
  | {
      authorized: false;
      decision: PolicyDecision;
      transactionRequest: null;
    };

function snapshotUntrustedProposal(proposal: unknown): unknown {
  try {
    return structuredClone(proposal);
  } catch {
    return null;
  }
}

/**
 * Evaluates a stable proposal snapshot and creates an execution request only
 * when every policy rule passes. Call this server-side; never accept an
 * `authorized` result or transaction request authored by the client/model.
 */
export async function authorizePaymentProposal(
  proposal: unknown,
  context: unknown,
  options: PolicyEvaluationOptions = {},
): Promise<PaymentAuthorizationResult> {
  const snapshot = snapshotUntrustedProposal(proposal);
  const decision = await evaluatePaymentPolicy(snapshot, context, options);

  if (!decision.approved) {
    return { authorized: false, decision, transactionRequest: null };
  }

  // Approval proves the snapshot has the exact safe PaymentProposal shape.
  const approvedProposal = snapshot as PaymentProposal;
  return {
    authorized: true,
    decision,
    transactionRequest: {
      proposalId: approvedProposal.id,
      destination: approvedProposal.recipient,
      amount: approvedProposal.amount,
      currency: approvedProposal.currency,
      reason: approvedProposal.reason,
    },
  };
}

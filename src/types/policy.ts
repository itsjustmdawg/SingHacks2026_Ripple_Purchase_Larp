export interface PolicyRuleResult {
  rule: string;
  passed: boolean;
  message: string;
}

export type PolicyPermission = "payments:spend" | "payments:approve";

/**
 * Identity and permissions resolved by trusted server-side authorization code.
 * These values must never be copied from an AI-authored payment proposal.
 */
export interface PolicyPrincipal {
  id: string;
  active: boolean;
  permissions: readonly PolicyPermission[];
}

export interface SpendingBudget {
  currency: "XRP";
  perTransactionLimitXrp: number;
  remainingBudgetXrp: number;
}

export interface HumanApprovalPolicy {
  /** A value of null disables threshold-based human approval. */
  requiredAtOrAboveXrp: number | null;
}

/** Trusted evidence that a human approver reviewed this exact payment. */
export interface PaymentApproval {
  proposalId: string;
  recipient: string;
  amount: number;
  currency: "XRP";
  approvedBy: PolicyPrincipal;
  approvedAt: string;
  expiresAt: string;
}

/** Policy-owned facts supplied independently from the model proposal. */
export interface PolicyEvaluationContext {
  principal: PolicyPrincipal;
  budget: SpendingBudget;
  approvalPolicy: HumanApprovalPolicy;
  approval?: PaymentApproval;
}

export interface PolicyDecision {
  proposalId: string;
  approved: boolean;
  reason: string;
  rulesChecked: PolicyRuleResult[];
  requiresHumanApproval: boolean;
  evaluatedAt: string;
}

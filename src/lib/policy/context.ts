import type { PolicyEvaluationContext } from "@/types";

export const DEVELOPMENT_TRANSACTION_LIMIT_XRP = 1_000;
export const DEVELOPMENT_REMAINING_BUDGET_XRP = 1_000;
export const DEVELOPMENT_APPROVAL_THRESHOLD_XRP = 100;

/**
 * Creates the server-owned context used by the scaffold policy endpoint.
 *
 * Production integration must replace this with authenticated identity,
 * current reserved/spent budget state, and approval evidence from a trusted
 * store. Returning a fresh object prevents one request from mutating another.
 */
export function createDevelopmentPolicyContext(): PolicyEvaluationContext {
  return {
    principal: {
      id: "development-user",
      active: true,
      permissions: ["payments:spend"],
    },
    budget: {
      currency: "XRP",
      perTransactionLimitXrp: DEVELOPMENT_TRANSACTION_LIMIT_XRP,
      remainingBudgetXrp: DEVELOPMENT_REMAINING_BUDGET_XRP,
    },
    approvalPolicy: {
      requiredAtOrAboveXrp: DEVELOPMENT_APPROVAL_THRESHOLD_XRP,
    },
  };
}

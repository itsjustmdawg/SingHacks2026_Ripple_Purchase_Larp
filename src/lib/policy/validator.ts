import type { PaymentProposal, PolicyDecision } from "@/types";

import {
  checkDevelopmentLimit,
  checkPaymentAction,
  checkPositiveAmount,
  checkRecipient,
} from "./rules";

/**
 * Evaluates temporary deterministic development rules.
 * These checks are not a production-ready authorization system.
 */
export async function evaluatePaymentPolicy(
  proposal: PaymentProposal,
): Promise<PolicyDecision> {
  const rulesChecked = [
    checkPaymentAction(proposal),
    checkRecipient(proposal),
    checkPositiveAmount(proposal),
    checkDevelopmentLimit(proposal),
  ];
  const approved = rulesChecked.every((result) => result.passed);

  return {
    proposalId: proposal.id,
    approved,
    reason: approved
      ? "Proposal passed all temporary development rules."
      : "Proposal failed one or more temporary development rules.",
    rulesChecked,
    requiresHumanApproval: false,
    evaluatedAt: new Date().toISOString(),
  };
}

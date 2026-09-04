import type { PaymentProposal, PolicyRuleResult } from "@/types";

// Temporary development guardrail only. The final policy model must be
// configurable and reviewed before it can authorize real payments.
export const DEVELOPMENT_TRANSACTION_LIMIT_XRP = 1_000;

export function checkPaymentAction(
  proposal: PaymentProposal,
): PolicyRuleResult {
  const passed = proposal.action === "payment";

  return {
    rule: "supported-payment-action",
    passed,
    message: passed
      ? "The proposal requests a payment."
      : "Only payment actions can be submitted for settlement.",
  };
}

export function checkRecipient(proposal: PaymentProposal): PolicyRuleResult {
  const passed = proposal.recipient.trim().length > 0;

  return {
    rule: "recipient-required",
    passed,
    message: passed
      ? "A recipient was provided."
      : "A non-empty recipient is required.",
  };
}

export function checkPositiveAmount(
  proposal: PaymentProposal,
): PolicyRuleResult {
  const passed = Number.isFinite(proposal.amount) && proposal.amount > 0;

  return {
    rule: "positive-amount",
    passed,
    message: passed
      ? "The amount is positive and finite."
      : "The amount must be a positive finite number.",
  };
}

export function checkDevelopmentLimit(
  proposal: PaymentProposal,
): PolicyRuleResult {
  const passed = proposal.amount <= DEVELOPMENT_TRANSACTION_LIMIT_XRP;

  return {
    rule: "development-transaction-limit",
    passed,
    message: passed
      ? `The amount is within the temporary ${DEVELOPMENT_TRANSACTION_LIMIT_XRP} XRP limit.`
      : `The amount exceeds the temporary ${DEVELOPMENT_TRANSACTION_LIMIT_XRP} XRP limit.`,
  };
}

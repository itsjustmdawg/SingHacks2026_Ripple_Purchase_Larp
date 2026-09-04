import type { PolicyDecision, PolicyRuleResult } from "@/types";

import {
  checkBudget,
  checkHumanApproval,
  checkPaymentSafety,
  checkPermissions,
  isHumanApprovalRequired,
} from "./rules";

export interface PolicyEvaluationOptions {
  now?: Date;
}

type RuleName =
  | "payment-parameters"
  | "spending-budget"
  | "payment-permission"
  | "human-approval";

function safelyEvaluateRule(
  rule: RuleName,
  evaluate: () => PolicyRuleResult,
): PolicyRuleResult {
  try {
    return evaluate();
  } catch {
    return {
      rule,
      passed: false,
      message: "The rule encountered an internal error and denied by default.",
    };
  }
}

function readSafeProposalId(proposal: unknown): string {
  try {
    if (
      typeof proposal !== "object" ||
      proposal === null ||
      Array.isArray(proposal)
    ) {
      return "unknown";
    }

    const id = (proposal as Record<string, unknown>).id;
    return typeof id === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id)
      ? id
      : "unknown";
  } catch {
    return "unknown";
  }
}

function resolveEvaluationTime(candidate: Date | undefined): Date {
  if (candidate instanceof Date && Number.isFinite(candidate.getTime())) {
    return new Date(candidate.getTime());
  }

  return new Date();
}

/**
 * Evaluates a model-authored proposal against independent, trusted policy facts.
 * Missing or malformed proposal/context data always produces a structured deny.
 */
export async function evaluatePaymentPolicy(
  proposal: unknown,
  context?: unknown,
  options: PolicyEvaluationOptions = {},
): Promise<PolicyDecision> {
  const evaluatedAt = resolveEvaluationTime(options.now);
  const rulesChecked = [
    safelyEvaluateRule("payment-parameters", () =>
      checkPaymentSafety(proposal),
    ),
    safelyEvaluateRule("spending-budget", () =>
      checkBudget(proposal, context),
    ),
    safelyEvaluateRule("payment-permission", () =>
      checkPermissions(context),
    ),
    safelyEvaluateRule("human-approval", () =>
      checkHumanApproval(proposal, context, evaluatedAt),
    ),
  ];
  const failedRules = rulesChecked.filter((rule) => !rule.passed);
  const approved = failedRules.length === 0;

  return {
    proposalId: readSafeProposalId(proposal),
    approved,
    reason: approved
      ? "Approved: all payment safety, budget, permission, and approval rules passed."
      : `Denied: ${failedRules
          .map((rule) => `[${rule.rule}] ${rule.message}`)
          .join(" ")}`,
    rulesChecked,
    requiresHumanApproval: isHumanApprovalRequired(proposal, context),
    evaluatedAt: evaluatedAt.toISOString(),
  };
}

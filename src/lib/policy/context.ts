import type { PolicyEvaluationContext } from "@/types";

import { xrpToDrops } from "./xrp-amount";

export const DEVELOPMENT_TRANSACTION_LIMIT_XRP = 1_000;
export const DEVELOPMENT_REMAINING_BUDGET_XRP = 1_000;
export const DEVELOPMENT_APPROVAL_THRESHOLD_XRP = 100;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

type PolicyEnvironment = Readonly<Record<string, string | undefined>>;

export class PolicyConfigurationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid policy configuration: ${issues.join("; ")}.`);
    this.name = "PolicyConfigurationError";
    this.issues = [...issues];
  }
}

function readXrpValue(
  environment: PolicyEnvironment,
  name: string,
  fallback: number,
  options: { positive: boolean },
  issues: string[],
): number {
  const raw = environment[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  const drops = xrpToDrops(value);
  if (drops === null || (options.positive && drops <= BigInt(0))) {
    issues.push(
      `${name} must be ${options.positive ? "a positive" : "a non-negative"} XRP value with at most six decimal places`,
    );
    return fallback;
  }

  return value;
}

function readApprovalThreshold(
  environment: PolicyEnvironment,
  issues: string[],
): number | null {
  const raw = environment.POLICY_APPROVAL_THRESHOLD_XRP?.trim();
  if (!raw) {
    return DEVELOPMENT_APPROVAL_THRESHOLD_XRP;
  }
  if (raw.toLowerCase() === "none") {
    return null;
  }

  return readXrpValue(
    environment,
    "POLICY_APPROVAL_THRESHOLD_XRP",
    DEVELOPMENT_APPROVAL_THRESHOLD_XRP,
    { positive: false },
    issues,
  );
}

function readSpendingEnabled(
  environment: PolicyEnvironment,
  issues: string[],
): boolean {
  const raw = environment.POLICY_SPENDING_ENABLED?.trim().toLowerCase();
  if (!raw) return true;
  if (raw === "true") return true;
  if (raw === "false") return false;

  issues.push("POLICY_SPENDING_ENABLED must be true or false");
  return false;
}

/**
 * Creates the server-owned context used by the scaffold policy endpoint.
 *
 * Production integration must replace this with authenticated identity,
 * current reserved/spent budget state, and approval evidence from a trusted
 * store. Returning a fresh object prevents one request from mutating another.
 */
export function createDevelopmentPolicyContext(): PolicyEvaluationContext {
  return createPolicyContextFromEnvironment({});
}

/**
 * Resolves development policy facts from server-owned environment variables.
 * Explicitly malformed configuration throws instead of silently widening
 * authorization. Production must replace the static remaining budget with an
 * authenticated, transactional budget store.
 */
export function createPolicyContextFromEnvironment(
  environment: PolicyEnvironment = process.env,
): PolicyEvaluationContext {
  const issues: string[] = [];
  const principalId =
    environment.POLICY_PRINCIPAL_ID?.trim() || "development-user";
  if (!SAFE_IDENTIFIER_PATTERN.test(principalId)) {
    issues.push(
      "POLICY_PRINCIPAL_ID must be a safe identifier of at most 128 characters",
    );
  }

  const spendingEnabled = readSpendingEnabled(environment, issues);
  const perTransactionLimitXrp = readXrpValue(
    environment,
    "POLICY_TRANSACTION_LIMIT_XRP",
    DEVELOPMENT_TRANSACTION_LIMIT_XRP,
    { positive: true },
    issues,
  );
  const remainingBudgetXrp = readXrpValue(
    environment,
    "POLICY_REMAINING_BUDGET_XRP",
    DEVELOPMENT_REMAINING_BUDGET_XRP,
    { positive: false },
    issues,
  );
  const requiredAtOrAboveXrp = readApprovalThreshold(environment, issues);

  if (issues.length > 0) {
    throw new PolicyConfigurationError(issues);
  }

  return {
    principal: {
      id: principalId,
      active: true,
      permissions: spendingEnabled ? ["payments:spend"] : [],
    },
    budget: {
      currency: "XRP",
      perTransactionLimitXrp,
      remainingBudgetXrp,
    },
    approvalPolicy: {
      requiredAtOrAboveXrp,
    },
  };
}

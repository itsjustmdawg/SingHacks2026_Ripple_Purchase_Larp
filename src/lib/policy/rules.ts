import type { PolicyRuleResult } from "@/types";

import { isValidClassicAddress } from "./xrpl-address";
import { xrpToDrops } from "./xrp-amount";

export const PAYMENT_PERMISSION = "payments:spend" as const;
export const APPROVAL_PERMISSION = "payments:approve" as const;

const PAYMENT_FIELDS = [
  "id",
  "action",
  "recipient",
  "amount",
  "currency",
  "reason",
  "confidence",
  "createdAt",
] as const;

const PAYMENT_FIELD_SET = new Set<string>(PAYMENT_FIELDS);
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_REASON_LENGTH = 500;
const ZERO_DROPS = BigInt(0);

type UnknownRecord = Record<string, unknown>;

function result(
  rule: string,
  passed: boolean,
  message: string,
): PolicyRuleResult {
  return { rule, passed, message };
}

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string" && SAFE_IDENTIFIER_PATTERN.test(value);
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function hasStringPermissions(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Validates all model-controlled payment parameters without trusting TS casts. */
export function checkPaymentSafety(proposal: unknown): PolicyRuleResult {
  try {
    const record = asRecord(proposal);
    if (record === null) {
      return result(
        "payment-parameters",
        false,
        "The payment proposal must be a JSON object with the required fields.",
      );
    }

    const issues: string[] = [];
    const unknownFields = Object.keys(record).filter(
      (field) => !PAYMENT_FIELD_SET.has(field),
    );
    if (unknownFields.length > 0) {
      issues.push("unknown fields are not allowed");
    }

    const missingFields = PAYMENT_FIELDS.filter(
      (field) => !Object.prototype.hasOwnProperty.call(record, field),
    );
    if (missingFields.length > 0) {
      issues.push("one or more required fields are missing");
    }

    if (!isSafeIdentifier(record.id)) {
      issues.push("id must be a safe non-empty identifier of at most 128 characters");
    }

    if (record.action !== "payment") {
      issues.push("action must be payment");
    }

    if (!isValidClassicAddress(record.recipient)) {
      issues.push("recipient must be a checksum-valid XRPL Classic address");
    }

    const amountDrops = xrpToDrops(record.amount);
    if (amountDrops === null || amountDrops <= ZERO_DROPS) {
      issues.push(
        "amount must be a positive finite XRP number with at most six decimal places",
      );
    }

    if (record.currency !== "XRP") {
      issues.push("currency must be XRP");
    }

    if (
      typeof record.reason !== "string" ||
      record.reason.trim().length === 0 ||
      record.reason.length > MAX_REASON_LENGTH
    ) {
      issues.push(`reason must contain 1 to ${MAX_REASON_LENGTH} characters`);
    }

    if (
      typeof record.confidence !== "number" ||
      !Number.isFinite(record.confidence) ||
      record.confidence < 0 ||
      record.confidence > 1
    ) {
      issues.push("confidence must be a finite number between 0 and 1");
    }

    if (!isCanonicalIsoTimestamp(record.createdAt)) {
      issues.push("createdAt must be a canonical ISO-8601 timestamp");
    }

    return issues.length === 0
      ? result(
          "payment-parameters",
          true,
          "Payment parameters are well-formed and safe for policy evaluation.",
        )
      : result(
          "payment-parameters",
          false,
          `Invalid payment parameters: ${issues.join("; ")}.`,
        );
  } catch {
    return result(
      "payment-parameters",
      false,
      "The payment proposal could not be safely inspected.",
    );
  }
}

/** Enforces both the per-transaction ceiling and the remaining spend budget. */
export function checkBudget(
  proposal: unknown,
  context: unknown,
): PolicyRuleResult {
  try {
    const proposalRecord = asRecord(proposal);
    const contextRecord = asRecord(context);
    const budget = asRecord(contextRecord?.budget);
    const amountDrops = xrpToDrops(proposalRecord?.amount);
    const perTransactionDrops = xrpToDrops(budget?.perTransactionLimitXrp);
    const remainingDrops = xrpToDrops(budget?.remainingBudgetXrp);

    if (
      budget === null ||
      budget.currency !== "XRP" ||
      perTransactionDrops === null ||
      perTransactionDrops <= ZERO_DROPS ||
      remainingDrops === null
    ) {
      return result(
        "spending-budget",
        false,
        "Trusted XRP budget limits are missing or invalid.",
      );
    }

    if (amountDrops === null || amountDrops <= ZERO_DROPS) {
      return result(
        "spending-budget",
        false,
        "The payment amount is invalid, so spending limits cannot be evaluated.",
      );
    }

    const failures: string[] = [];
    if (amountDrops > perTransactionDrops) {
      failures.push(
        `amount exceeds the ${String(budget.perTransactionLimitXrp)} XRP per-transaction limit`,
      );
    }
    if (amountDrops > remainingDrops) {
      failures.push(
        `amount exceeds the ${String(budget.remainingBudgetXrp)} XRP remaining budget`,
      );
    }

    return failures.length === 0
      ? result(
          "spending-budget",
          true,
          "The amount is within both the per-transaction and remaining XRP budgets.",
        )
      : result(
          "spending-budget",
          false,
          `Budget denied: ${failures.join("; ")}.`,
        );
  } catch {
    return result(
      "spending-budget",
      false,
      "The spending budget could not be safely evaluated.",
    );
  }
}

/** Verifies that an active, trusted principal may initiate spending. */
export function checkPermissions(context: unknown): PolicyRuleResult {
  try {
    const contextRecord = asRecord(context);
    const principal = asRecord(contextRecord?.principal);

    if (
      principal === null ||
      !isSafeIdentifier(principal.id) ||
      principal.active !== true ||
      !hasStringPermissions(principal.permissions)
    ) {
      return result(
        "payment-permission",
        false,
        "An active trusted principal with valid permissions is required.",
      );
    }

    const passed = principal.permissions.includes(PAYMENT_PERMISSION);
    return result(
      "payment-permission",
      passed,
      passed
        ? "The principal has permission to spend XRP."
        : "The principal does not have the payments:spend permission.",
    );
  } catch {
    return result(
      "payment-permission",
      false,
      "Payment permissions could not be safely evaluated.",
    );
  }
}

function getApprovalRequirement(
  proposal: unknown,
  context: unknown,
): { required: boolean; valid: boolean; threshold: unknown } {
  const proposalRecord = asRecord(proposal);
  const contextRecord = asRecord(context);
  const approvalPolicy = asRecord(contextRecord?.approvalPolicy);
  const threshold = approvalPolicy?.requiredAtOrAboveXrp;

  if (approvalPolicy === null) {
    return { required: false, valid: false, threshold };
  }
  if (threshold === null) {
    return { required: false, valid: true, threshold };
  }

  const amountDrops = xrpToDrops(proposalRecord?.amount);
  const thresholdDrops = xrpToDrops(threshold);
  if (
    amountDrops === null ||
    amountDrops <= ZERO_DROPS ||
    thresholdDrops === null
  ) {
    return { required: false, valid: false, threshold };
  }

  return {
    required: amountDrops >= thresholdDrops,
    valid: true,
    threshold,
  };
}

/** Returns whether the configured inclusive approval threshold is reached. */
export function isHumanApprovalRequired(
  proposal: unknown,
  context: unknown,
): boolean {
  try {
    const requirement = getApprovalRequirement(proposal, context);
    return requirement.valid && requirement.required;
  } catch {
    return false;
  }
}

/** Verifies trusted human approval evidence when the threshold is reached. */
export function checkHumanApproval(
  proposal: unknown,
  context: unknown,
  evaluatedAt = new Date(),
): PolicyRuleResult {
  try {
    const proposalRecord = asRecord(proposal);
    const contextRecord = asRecord(context);
    const requirement = getApprovalRequirement(proposal, context);

    if (!requirement.valid) {
      return result(
        "human-approval",
        false,
        "The human-approval policy or payment amount is missing or invalid.",
      );
    }

    if (!requirement.required) {
      return result(
        "human-approval",
        true,
        "The payment is below the configured human-approval threshold.",
      );
    }

    const approval = asRecord(contextRecord?.approval);
    if (approval === null) {
      return result(
        "human-approval",
        false,
        `Human approval is required at or above ${String(requirement.threshold)} XRP but was not supplied.`,
      );
    }

    const approvedBy = asRecord(approval.approvedBy);
    const principal = asRecord(contextRecord?.principal);
    const approvedAmountDrops = xrpToDrops(approval.amount);
    const proposalAmountDrops = xrpToDrops(proposalRecord?.amount);
    const approvedAtValid = isCanonicalIsoTimestamp(approval.approvedAt);
    const expiresAtValid = isCanonicalIsoTimestamp(approval.expiresAt);
    const nowMs = evaluatedAt.getTime();
    const failures: string[] = [];

    if (approval.proposalId !== proposalRecord?.id) {
      failures.push("approval is bound to a different proposal");
    }
    if (approval.recipient !== proposalRecord?.recipient) {
      failures.push("approval is bound to a different recipient");
    }
    if (approval.currency !== proposalRecord?.currency) {
      failures.push("approval is bound to a different currency");
    }
    if (
      approvedAmountDrops === null ||
      proposalAmountDrops === null ||
      approvedAmountDrops !== proposalAmountDrops
    ) {
      failures.push("approval is bound to a different amount");
    }
    if (
      approvedBy === null ||
      !isSafeIdentifier(approvedBy.id) ||
      approvedBy.active !== true ||
      !hasStringPermissions(approvedBy.permissions) ||
      !approvedBy.permissions.includes(APPROVAL_PERMISSION)
    ) {
      failures.push("approver is inactive or lacks payments:approve permission");
    } else if (approvedBy.id === principal?.id) {
      failures.push("the spender cannot approve their own payment");
    }
    if (!approvedAtValid || !expiresAtValid || !Number.isFinite(nowMs)) {
      failures.push("approval timestamps are invalid");
    } else {
      const approvedAtMs = new Date(approval.approvedAt as string).getTime();
      const expiresAtMs = new Date(approval.expiresAt as string).getTime();
      if (approvedAtMs > nowMs) {
        failures.push("approval time is in the future");
      }
      if (expiresAtMs <= nowMs) {
        failures.push("approval has expired");
      }
      if (expiresAtMs <= approvedAtMs) {
        failures.push("approval expiry is not after its approval time");
      }
      if (
        isCanonicalIsoTimestamp(proposalRecord?.createdAt) &&
        approvedAtMs < new Date(proposalRecord.createdAt as string).getTime()
      ) {
        failures.push("approval predates the proposal");
      }
    }

    return failures.length === 0
      ? result(
          "human-approval",
          true,
          "Valid human approval is bound to this exact payment.",
        )
      : result(
          "human-approval",
          false,
          `Human approval denied: ${failures.join("; ")}.`,
        );
  } catch {
    return result(
      "human-approval",
      false,
      "Human approval could not be safely evaluated.",
    );
  }
}

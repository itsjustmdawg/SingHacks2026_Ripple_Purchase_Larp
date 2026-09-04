import { describe, expect, it } from "vitest";

import {
  createDevelopmentPolicyContext,
  createPolicyContextFromEnvironment,
  PolicyConfigurationError,
} from "./context";

describe("createPolicyContextFromEnvironment", () => {
  it("preserves the documented development defaults", () => {
    expect(createPolicyContextFromEnvironment({})).toEqual(
      createDevelopmentPolicyContext(),
    );
  });

  it("loads server-owned policy values", () => {
    expect(
      createPolicyContextFromEnvironment({
        POLICY_PRINCIPAL_ID: "agent-owner-7",
        POLICY_SPENDING_ENABLED: "true",
        POLICY_TRANSACTION_LIMIT_XRP: "25.5",
        POLICY_REMAINING_BUDGET_XRP: "80",
        POLICY_APPROVAL_THRESHOLD_XRP: "10",
      }),
    ).toEqual({
      principal: {
        id: "agent-owner-7",
        active: true,
        permissions: ["payments:spend"],
      },
      budget: {
        currency: "XRP",
        perTransactionLimitXrp: 25.5,
        remainingBudgetXrp: 80,
      },
      approvalPolicy: { requiredAtOrAboveXrp: 10 },
    });
  });

  it("can disable spending without trusting request data", () => {
    const context = createPolicyContextFromEnvironment({
      POLICY_SPENDING_ENABLED: "false",
    });

    expect(context.principal.permissions).toEqual([]);
  });

  it("supports disabling the business-approval threshold explicitly", () => {
    const context = createPolicyContextFromEnvironment({
      POLICY_APPROVAL_THRESHOLD_XRP: "none",
    });

    expect(context.approvalPolicy.requiredAtOrAboveXrp).toBeNull();
  });

  it("allows a fully spent remaining budget so policy can deny payments", () => {
    const context = createPolicyContextFromEnvironment({
      POLICY_REMAINING_BUDGET_XRP: "0",
    });

    expect(context.budget.remainingBudgetXrp).toBe(0);
  });

  it.each([
    ["bad principal", { POLICY_PRINCIPAL_ID: "bad principal" }],
    ["bad boolean", { POLICY_SPENDING_ENABLED: "yes" }],
    ["zero transaction limit", { POLICY_TRANSACTION_LIMIT_XRP: "0" }],
    ["negative remaining budget", { POLICY_REMAINING_BUDGET_XRP: "-1" }],
    [
      "fractional drops",
      { POLICY_APPROVAL_THRESHOLD_XRP: "1.0000001" },
    ],
  ])("fails closed for %s", (_case, environment) => {
    expect(() => createPolicyContextFromEnvironment(environment)).toThrow(
      PolicyConfigurationError,
    );
  });
});

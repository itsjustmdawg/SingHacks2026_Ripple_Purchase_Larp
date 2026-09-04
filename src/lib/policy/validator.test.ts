import { describe, expect, it } from "vitest";

import type {
  HumanApprovalPolicy,
  PaymentApproval,
  PaymentProposal,
  PolicyDecision,
  PolicyEvaluationContext,
  PolicyPrincipal,
  SpendingBudget,
} from "@/types";

import { evaluatePaymentPolicy } from "./validator";

const RECIPIENT = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const OTHER_RECIPIENT = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const FIXED_NOW = new Date("2026-09-04T12:00:00.000Z");
const PROPOSAL_CREATED_AT = "2026-09-04T11:00:00.000Z";
const APPROVED_AT = "2026-09-04T11:30:00.000Z";
const EXPIRES_AT = "2026-09-04T12:30:00.000Z";

const EXPECTED_RULE_ORDER = [
  "payment-parameters",
  "spending-budget",
  "payment-permission",
  "human-approval",
];

interface ContextOverrides {
  principal?: Partial<PolicyPrincipal>;
  budget?: Partial<SpendingBudget>;
  approvalPolicy?: Partial<HumanApprovalPolicy>;
  approval?: PaymentApproval;
}

function makeProposal(
  overrides: Partial<PaymentProposal> = {},
): PaymentProposal {
  return {
    id: "proposal-123",
    action: "payment",
    recipient: RECIPIENT,
    amount: 25,
    currency: "XRP",
    reason: "Pay for the selected item",
    confidence: 0.95,
    createdAt: PROPOSAL_CREATED_AT,
    ...overrides,
  };
}

function makeContext(
  overrides: ContextOverrides = {},
): PolicyEvaluationContext {
  const context: PolicyEvaluationContext = {
    principal: {
      id: "spender-123",
      active: true,
      permissions: ["payments:spend"],
      ...overrides.principal,
    },
    budget: {
      currency: "XRP",
      perTransactionLimitXrp: 1_000,
      remainingBudgetXrp: 1_000,
      ...overrides.budget,
    },
    approvalPolicy: {
      requiredAtOrAboveXrp: 100,
      ...overrides.approvalPolicy,
    },
  };

  if (overrides.approval !== undefined) {
    context.approval = overrides.approval;
  }

  return context;
}

function makeApproval(
  proposal: PaymentProposal,
  overrides: Partial<PaymentApproval> = {},
): PaymentApproval {
  return {
    proposalId: proposal.id,
    recipient: proposal.recipient,
    amount: proposal.amount,
    currency: proposal.currency,
    approvedBy: {
      id: "approver-456",
      active: true,
      permissions: ["payments:approve"],
    },
    approvedAt: APPROVED_AT,
    expiresAt: EXPIRES_AT,
    ...overrides,
  };
}

function withoutField<T extends object>(value: T, field: keyof T): Partial<T> {
  const copy: Partial<T> = { ...value };
  delete copy[field];
  return copy;
}

function getRule(decision: PolicyDecision, ruleName: string) {
  const rule = decision.rulesChecked.find(({ rule }) => rule === ruleName);
  expect(rule, `expected the ${ruleName} rule to be evaluated`).toBeDefined();
  return rule!;
}

async function evaluate(
  proposal: unknown = makeProposal(),
  context: unknown = makeContext(),
) {
  return evaluatePaymentPolicy(proposal, context, { now: FIXED_NOW });
}

describe("evaluatePaymentPolicy", () => {
  describe("successful evaluations and budget boundaries", () => {
    it("approves a safe payment one drop below the approval threshold", async () => {
      const proposal = makeProposal({ amount: 99.999999 });
      const decision = await evaluate(proposal);

      expect(decision).toMatchObject({
        proposalId: proposal.id,
        approved: true,
        requiresHumanApproval: false,
        evaluatedAt: FIXED_NOW.toISOString(),
        reason:
          "Approved: all payment safety, budget, permission, and approval rules passed.",
      });
      expect(decision.rulesChecked).toHaveLength(4);
      expect(decision.rulesChecked.every(({ passed }) => passed)).toBe(true);
    });

    it("allows an amount exactly equal to both budget limits", async () => {
      const proposal = makeProposal({ amount: 10 });
      const context = makeContext({
        budget: {
          perTransactionLimitXrp: 10,
          remainingBudgetXrp: 10,
        },
      });

      const decision = await evaluate(proposal, context);

      expect(decision.approved).toBe(true);
      expect(getRule(decision, "spending-budget")).toMatchObject({
        passed: true,
        message:
          "The amount is within both the per-transaction and remaining XRP budgets.",
      });
    });

    it.each([
      {
        name: "per-transaction limit",
        budget: {
          perTransactionLimitXrp: 10,
          remainingBudgetXrp: 20,
        },
        expectedMessage:
          "amount exceeds the 10 XRP per-transaction limit",
      },
      {
        name: "remaining budget",
        budget: {
          perTransactionLimitXrp: 20,
          remainingBudgetXrp: 10,
        },
        expectedMessage: "amount exceeds the 10 XRP remaining budget",
      },
    ])("denies one drop over the $name", async ({ budget, expectedMessage }) => {
      const decision = await evaluate(
        makeProposal({ amount: 10.000001 }),
        makeContext({ budget }),
      );

      expect(decision.approved).toBe(false);
      expect(getRule(decision, "spending-budget")).toMatchObject({
        passed: false,
      });
      expect(getRule(decision, "spending-budget").message).toContain(
        expectedMessage,
      );
    });
  });

  describe("trusted identity and permission checks", () => {
    it("denies when the trusted context is missing", async () => {
      const decision = await evaluatePaymentPolicy(makeProposal(), undefined, {
        now: FIXED_NOW,
      });

      expect(decision.approved).toBe(false);
      expect(getRule(decision, "payment-parameters").passed).toBe(true);
      expect(getRule(decision, "spending-budget").message).toBe(
        "Trusted XRP budget limits are missing or invalid.",
      );
      expect(getRule(decision, "payment-permission").message).toBe(
        "An active trusted principal with valid permissions is required.",
      );
      expect(getRule(decision, "human-approval").message).toBe(
        "The human-approval policy or payment amount is missing or invalid.",
      );
    });

    it.each([
      {
        name: "principal is missing",
        context: {
          budget: makeContext().budget,
          approvalPolicy: makeContext().approvalPolicy,
        },
        expectedMessage:
          "An active trusted principal with valid permissions is required.",
      },
      {
        name: "principal is inactive",
        context: makeContext({ principal: { active: false } }),
        expectedMessage:
          "An active trusted principal with valid permissions is required.",
      },
      {
        name: "spend permission is absent",
        context: makeContext({ principal: { permissions: [] } }),
        expectedMessage:
          "The principal does not have the payments:spend permission.",
      },
    ])("denies when the $name", async ({ context, expectedMessage }) => {
      const decision = await evaluate(makeProposal(), context);

      expect(decision.approved).toBe(false);
      expect(getRule(decision, "payment-permission")).toMatchObject({
        passed: false,
        message: expectedMessage,
      });
    });
  });

  describe("inclusive human-approval policy", () => {
    it("requires approval at the exact configured threshold", async () => {
      const proposal = makeProposal({ amount: 100 });
      const decision = await evaluate(proposal);

      expect(decision).toMatchObject({
        approved: false,
        requiresHumanApproval: true,
      });
      expect(getRule(decision, "human-approval")).toMatchObject({
        passed: false,
        message:
          "Human approval is required at or above 100 XRP but was not supplied.",
      });
    });

    it("accepts exact payment and budget bounds with matching approval", async () => {
      const proposal = makeProposal({ amount: 100 });
      const context = makeContext({
        budget: {
          perTransactionLimitXrp: 100,
          remainingBudgetXrp: 100,
        },
        approval: makeApproval(proposal),
      });

      const decision = await evaluate(proposal, context);

      expect(decision).toMatchObject({
        approved: true,
        requiresHumanApproval: true,
      });
      expect(getRule(decision, "human-approval")).toMatchObject({
        passed: true,
        message: "Valid human approval is bound to this exact payment.",
      });
    });

    it.each([
      {
        name: "expired",
        approvalOverrides: { expiresAt: FIXED_NOW.toISOString() },
        expectedMessage: "approval has expired",
      },
      {
        name: "self-approved",
        approvalOverrides: {
          approvedBy: {
            id: "spender-123",
            active: true,
            permissions: ["payments:approve"] as const,
          },
        },
        expectedMessage: "the spender cannot approve their own payment",
      },
      {
        name: "bound to another proposal",
        approvalOverrides: { proposalId: "proposal-elsewhere" },
        expectedMessage: "approval is bound to a different proposal",
      },
      {
        name: "bound to another recipient",
        approvalOverrides: { recipient: OTHER_RECIPIENT },
        expectedMessage: "approval is bound to a different recipient",
      },
      {
        name: "bound to another amount",
        approvalOverrides: { amount: 100.000001 },
        expectedMessage: "approval is bound to a different amount",
      },
    ])(
      "denies an approval that is $name",
      async ({ approvalOverrides, expectedMessage }) => {
        const proposal = makeProposal({ amount: 100 });
        const context = makeContext({
          approval: makeApproval(proposal, approvalOverrides),
        });

        const decision = await evaluate(proposal, context);

        expect(decision.approved).toBe(false);
        expect(decision.requiresHumanApproval).toBe(true);
        expect(getRule(decision, "human-approval").passed).toBe(false);
        expect(getRule(decision, "human-approval").message).toContain(
          expectedMessage,
        );
      },
    );
  });

  describe("untrusted proposal validation", () => {
    it.each([
      {
        name: "null",
        proposal: null,
        expectedMessage: "must be a JSON object",
      },
      {
        name: "an array",
        proposal: [],
        expectedMessage: "must be a JSON object",
      },
      {
        name: "an object with a missing field",
        proposal: withoutField(makeProposal(), "recipient"),
        expectedMessage: "one or more required fields are missing",
      },
      {
        name: "an object with wrong field types",
        proposal: {
          id: 123,
          action: true,
          recipient: {},
          amount: "25",
          currency: 123,
          reason: false,
          confidence: "high",
          createdAt: 123,
        },
        expectedMessage: "id must be a safe non-empty identifier",
      },
      {
        name: "an object with an unknown field",
        proposal: { ...makeProposal(), destinationTag: 123 },
        expectedMessage: "unknown fields are not allowed",
      },
    ])("denies $name", async ({ proposal, expectedMessage }) => {
      const decision = await evaluate(proposal);

      expect(decision.approved).toBe(false);
      expect(getRule(decision, "payment-parameters").passed).toBe(false);
      expect(getRule(decision, "payment-parameters").message).toContain(
        expectedMessage,
      );
    });

    it.each([
      {
        name: "unsupported action",
        overrides: { action: "request_payment" },
        expectedMessage: "action must be payment",
      },
      {
        name: "unsupported currency",
        overrides: { currency: "USD" },
        expectedMessage: "currency must be XRP",
      },
      {
        name: "checksum-invalid address",
        overrides: { recipient: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTp" },
        expectedMessage:
          "recipient must be a checksum-valid XRPL Classic address",
      },
    ])("denies an $name", async ({ overrides, expectedMessage }) => {
      const decision = await evaluate({ ...makeProposal(), ...overrides });

      expect(decision.approved).toBe(false);
      expect(getRule(decision, "payment-parameters")).toMatchObject({
        passed: false,
      });
      expect(getRule(decision, "payment-parameters").message).toContain(
        expectedMessage,
      );
    });

    it.each([
      ["zero", 0],
      ["negative", -0.000001],
      ["NaN", Number.NaN],
      ["positive infinity", Number.POSITIVE_INFINITY],
      ["negative infinity", Number.NEGATIVE_INFINITY],
      ["fractional-drop precision", 1.0000001],
      ["above the XRP maximum", 100_000_000_001],
    ])("denies a %s amount", async (_name, amount) => {
      const decision = await evaluate({ ...makeProposal(), amount });

      expect(decision.approved).toBe(false);
      expect(getRule(decision, "payment-parameters")).toMatchObject({
        passed: false,
      });
      expect(getRule(decision, "payment-parameters").message).toContain(
        "amount must be a positive finite XRP number with at most six decimal places",
      );
      expect(getRule(decision, "spending-budget").passed).toBe(false);
    });
  });

  describe("deterministic aggregation and defensive behavior", () => {
    it("always evaluates all four rules in deterministic order", async () => {
      const decision = await evaluatePaymentPolicy(null, undefined, {
        now: FIXED_NOW,
      });

      expect(decision.rulesChecked.map(({ rule }) => rule)).toEqual(
        EXPECTED_RULE_ORDER,
      );
      expect(decision.rulesChecked).toHaveLength(4);
    });

    it("returns detailed reasons for every failed rule in rule order", async () => {
      const proposal = makeProposal({ amount: 10.000001 });
      const context = makeContext({
        principal: { permissions: [] },
        budget: {
          perTransactionLimitXrp: 10,
          remainingBudgetXrp: 10,
        },
        approvalPolicy: { requiredAtOrAboveXrp: 10 },
      });

      const decision = await evaluate(proposal, context);

      expect(decision.approved).toBe(false);
      expect(decision.reason).toBe(
        "Denied: [spending-budget] Budget denied: amount exceeds the 10 XRP per-transaction limit; amount exceeds the 10 XRP remaining budget. " +
          "[payment-permission] The principal does not have the payments:spend permission. " +
          "[human-approval] Human approval is required at or above 10 XRP but was not supplied.",
      );
      expect(
        decision.rulesChecked
          .filter(({ passed }) => !passed)
          .map(({ rule }) => rule),
      ).toEqual([
        "spending-budget",
        "payment-permission",
        "human-approval",
      ]);
    });

    it("fails closed without throwing for objects with hostile getters", async () => {
      const hostileProposal = new Proxy<Record<string, unknown>>(
        {},
        {
          get(): never {
            throw new Error("untrusted getter must not escape");
          },
          ownKeys(): never {
            throw new Error("untrusted ownKeys must not escape");
          },
        },
      );

      await expect(evaluate(hostileProposal)).resolves.toMatchObject({
        proposalId: "unknown",
        approved: false,
        requiresHumanApproval: false,
      });

      const decision = await evaluate(hostileProposal);
      expect(decision.rulesChecked.map(({ rule }) => rule)).toEqual(
        EXPECTED_RULE_ORDER,
      );
      expect(getRule(decision, "payment-parameters").passed).toBe(false);
    });

    it("fails closed without throwing for a revoked proxy", async () => {
      const { proxy, revoke } = Proxy.revocable<Record<string, unknown>>({}, {});
      revoke();

      await expect(evaluate(proxy)).resolves.toMatchObject({
        proposalId: "unknown",
        approved: false,
      });
    });

    it("does not mutate the proposal, context, approval, or supplied time", async () => {
      const proposal = makeProposal({ amount: 100 });
      const context = makeContext({ approval: makeApproval(proposal) });
      const proposalBefore = structuredClone(proposal);
      const contextBefore = structuredClone(context);
      const now = new Date(FIXED_NOW.getTime());
      const nowBefore = now.getTime();

      const decision = await evaluatePaymentPolicy(proposal, context, { now });

      expect(decision.approved).toBe(true);
      expect(proposal).toEqual(proposalBefore);
      expect(context).toEqual(contextBefore);
      expect(now.getTime()).toBe(nowBefore);
      expect(decision.evaluatedAt).toBe(FIXED_NOW.toISOString());
    });
  });
});

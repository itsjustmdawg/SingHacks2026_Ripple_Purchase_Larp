import { describe, expect, it } from "vitest";

import {
  AgentModelOutputError,
  createConfiguredAgentModel,
  validateAgentModelDecision,
} from "./openai-model";

const ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

const validDecision = {
  action: "payment",
  recipient: ADDRESS,
  amount: 2.5,
  reason: "Pay for the selected data service.",
  confidence: 0.93,
};

describe("validateAgentModelDecision", () => {
  it("accepts and normalizes a complete model decision", () => {
    expect(
      validateAgentModelDecision({
        ...validDecision,
        reason: `  ${validDecision.reason}  `,
      }),
    ).toEqual(validDecision);
  });

  it("accepts an explicit no-action decision", () => {
    expect(
      validateAgentModelDecision({
        action: "none",
        recipient: null,
        amount: null,
        reason: "No recipient or amount was supplied.",
        confidence: 0.2,
      }),
    ).toMatchObject({ action: "none", recipient: null, amount: null });
  });

  it.each([
    null,
    { ...validDecision, extra: true },
    { ...validDecision, action: "withdraw" },
    { ...validDecision, recipient: "not-an-address" },
    { ...validDecision, amount: -1 },
    { ...validDecision, reason: "" },
    { ...validDecision, confidence: 2 },
    { ...validDecision, amount: null },
  ])("rejects malformed or incomplete model output", (value) => {
    expect(() => validateAgentModelDecision(value)).toThrow(
      AgentModelOutputError,
    );
  });
});

describe("createConfiguredAgentModel", () => {
  it("keeps model calls disabled when no API key is configured", () => {
    expect(createConfiguredAgentModel({})).toBeNull();
  });

  it("creates a model adapter when an API key is configured", () => {
    expect(
      createConfiguredAgentModel({
        LLM_API_KEY: "test-key",
        LLM_MODEL: "test-model",
      }),
    ).not.toBeNull();
  });
});

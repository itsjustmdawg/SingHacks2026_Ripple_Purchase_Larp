import { describe, expect, it, vi } from "vitest";

import type { GeminiJsonGenerator } from "@/lib/gemini";

import {
  AgentModelOutputError,
  createConfiguredAgentModel,
  GeminiAgentModel,
  validateAgentModelDecision,
} from "./gemini-model";

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

  it("accepts the explicit Gemini environment variable", () => {
    expect(
      createConfiguredAgentModel({
        GEMINI_API_KEY: "test-key",
        GEMINI_MODEL: "gemini-test",
      }),
    ).not.toBeNull();
  });

});

describe("GeminiAgentModel", () => {
  it("requests structured output and validates it", async () => {
    const generateJson = vi.fn().mockResolvedValue(validDecision);
    const client: GeminiJsonGenerator = {
      model: "gemini-test",
      generateJson,
    };
    const model = new GeminiAgentModel(client);

    await expect(
      model.interpret({
        id: "request-1",
        userMessage: `Pay ${ADDRESS} 2.5 XRP for the selected data service.`,
        timestamp: "2026-09-05T04:00:00.000Z",
      }),
    ).resolves.toEqual(validDecision);
    expect(generateJson).toHaveBeenCalledOnce();
  });
});

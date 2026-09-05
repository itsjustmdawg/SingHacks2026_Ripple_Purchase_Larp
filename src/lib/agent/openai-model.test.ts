import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AgentModelOutputError,
  createConfiguredAgentModel,
  OpenAIAgentModel,
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

describe("OpenAIAgentModel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Chat Completions for Gemini's OpenAI-compatible endpoint", async () => {
    const fetchMock = vi.fn(async (...requestArguments: Parameters<typeof fetch>) => {
      void requestArguments;
      return new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 1,
          model: "gemini-test",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: JSON.stringify(validDecision),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const model = new OpenAIAgentModel({
      apiKey: "test-key",
      model: "gemini-test",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    const result = await model.interpret({
      id: "request-1",
      userMessage: `Pay ${ADDRESS} 2.5 XRP for the selected data service.`,
      timestamp: "2026-09-05T04:00:00.000Z",
    });

    expect(result).toEqual(validDecision);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/chat/completions");
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(requestBody).toBeDefined();
    const body = JSON.parse(String(requestBody)) as {
      response_format?: { type?: string };
    };
    expect(body.response_format?.type).toBe("json_schema");
  });
});

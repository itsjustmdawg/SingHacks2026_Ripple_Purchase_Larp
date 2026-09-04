import { describe, expect, it } from "vitest";

import {
  AgentRequestValidationError,
  validateAgentRequest,
} from "./validation";

const validRequest = {
  id: "request-123",
  userMessage: "Pay 2 XRP to a recipient.",
  timestamp: "2026-09-05T00:00:00.000Z",
};

describe("validateAgentRequest", () => {
  it("returns a normalized valid request", () => {
    expect(
      validateAgentRequest({
        ...validRequest,
        userMessage: `  ${validRequest.userMessage}  `,
      }),
    ).toEqual(validRequest);
  });

  it.each([null, undefined, [], "request", 123])(
    "rejects a non-object request (%p)",
    (value) => {
      expect(() => validateAgentRequest(value)).toThrow(
        AgentRequestValidationError,
      );
    },
  );

  it("rejects missing and unexpected fields", () => {
    expect(() =>
      validateAgentRequest({ id: "request-1", unexpected: true }),
    ).toThrow(/unknown fields.*required.*userMessage/i);
  });

  it.each(["", "bad id", "-leading-dash", "a".repeat(101)])(
    "rejects unsafe request id %p",
    (id) => {
      expect(() => validateAgentRequest({ ...validRequest, id })).toThrow(
        /id must be a safe non-empty identifier/,
      );
    },
  );

  it.each(["", "   ", "x".repeat(2_001)])(
    "rejects invalid user message length",
    (userMessage) => {
      expect(() =>
        validateAgentRequest({ ...validRequest, userMessage }),
      ).toThrow(/userMessage must contain/);
    },
  );

  it("rejects a non-canonical timestamp", () => {
    expect(() =>
      validateAgentRequest({ ...validRequest, timestamp: "2026-09-05" }),
    ).toThrow(/canonical ISO-8601 timestamp/);
  });
});

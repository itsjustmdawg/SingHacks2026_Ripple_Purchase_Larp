import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ENDPOINT = "http://localhost/api/agents/orchestrate";

function postJson(body: unknown): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/agents/orchestrate", () => {
  it("returns the complete multi-agent procurement result", async () => {
    const response = await POST(
      postJson({
        id: "api-multi-1",
        userMessage: "Find the best encrypted cloud storage under 5 XRP",
        timestamp: "2026-09-05T00:00:00.000Z",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      pipelineId: "pipeline:api-multi-1",
      analysis: { selectedOffer: { provider: "CloudDrop" } },
      proposal: { amount: 3.8, action: "payment" },
      policyDecision: { approved: true },
      trace: [
        { agent: "market_scout" },
        { agent: "deal_analyst" },
        { agent: "treasury" },
        { agent: "policy_engine", status: "approved" },
      ],
    });
  });

  it("returns 400 for malformed requests", async () => {
    const response = await POST(postJson({ userMessage: "Find storage" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Invalid agent request"),
    });
  });

  it("fails closed when server policy configuration is invalid", async () => {
    vi.stubEnv("POLICY_TRANSACTION_LIMIT_XRP", "invalid");
    const response = await POST(
      postJson({
        id: "api-multi-2",
        userMessage: "Find cloud storage under 5 XRP",
        timestamp: "2026-09-05T00:00:00.000Z",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Policy configuration is invalid.",
    });
  });
});

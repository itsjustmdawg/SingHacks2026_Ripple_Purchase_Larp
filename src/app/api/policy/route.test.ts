import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ENDPOINT = "http://localhost/api/policy";
const proposal = {
  id: "proposal-api-1",
  action: "payment",
  recipient: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  amount: 2.5,
  currency: "XRP",
  reason: "Purchase market data.",
  confidence: 0.95,
  createdAt: "2026-09-05T00:00:00.000Z",
};

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

describe("POST /api/policy", () => {
  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request(ENDPOINT, { method: "POST", body: "{" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body.",
    });
  });

  it("approves a valid proposal under server-owned limits", async () => {
    const response = await POST(postJson(proposal));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      proposalId: proposal.id,
      approved: true,
      requiresHumanApproval: false,
    });
  });

  it("returns a structured denial for hostile request data", async () => {
    const response = await POST(postJson({ ...proposal, approved: true }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      proposalId: proposal.id,
      approved: false,
      rulesChecked: expect.arrayContaining([
        expect.objectContaining({ rule: "payment-parameters", passed: false }),
      ]),
    });
  });

  it("honors a server-side spending kill switch", async () => {
    vi.stubEnv("POLICY_SPENDING_ENABLED", "false");
    const response = await POST(postJson(proposal));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      approved: false,
      rulesChecked: expect.arrayContaining([
        expect.objectContaining({ rule: "payment-permission", passed: false }),
      ]),
    });
  });

  it("returns 503 rather than widening invalid server policy", async () => {
    vi.stubEnv("POLICY_TRANSACTION_LIMIT_XRP", "not-a-number");
    const response = await POST(postJson(proposal));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Policy configuration is invalid.",
      issues: expect.arrayContaining([
        expect.stringContaining("POLICY_TRANSACTION_LIMIT_XRP"),
      ]),
    });
  });
});

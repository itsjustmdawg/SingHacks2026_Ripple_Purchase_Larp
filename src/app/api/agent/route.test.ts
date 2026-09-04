import { describe, expect, it } from "vitest";

import { POST } from "./route";

const ENDPOINT = "http://localhost/api/agent";
const ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

describe("POST /api/agent", () => {
  it("returns a structured payment proposal", async () => {
    const response = await POST(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "api-request-1",
          userMessage: `Send 2 XRP to ${ADDRESS}`,
          timestamp: "2026-09-05T00:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "proposal:api-request-1",
      action: "payment",
      recipient: ADDRESS,
      amount: 2,
      currency: "XRP",
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request(ENDPOINT, { method: "POST", body: "{" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON body.",
    });
  });

  it("returns validation details for malformed requests", async () => {
    const response = await POST(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: "Pay 2 XRP" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Invalid agent request"),
      issues: expect.arrayContaining([
        "id, userMessage, and timestamp are required",
      ]),
    });
  });
});

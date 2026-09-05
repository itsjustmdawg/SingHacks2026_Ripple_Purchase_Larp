import { afterEach, describe, expect, it, vi } from "vitest";
import { purchaseService, RequestError } from "./purchase";
import { buildObjective } from "./objective";
import { queryCatalog } from "@/lib/catalog/catalog";
import type { PaymentProposal } from "@/types";
afterEach(() => vi.unstubAllGlobals());
describe("purchase UI contracts", () => {
  it("preserves failed payment hashes for reconciliation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              transactionId: "tx-1",
              status: "failed",
              hash: "ABC",
              error: "tecFAILED",
            }),
            { status: 422 },
          ),
        ),
    );
    expect(await purchaseService.submit({} as PaymentProposal)).toMatchObject({
      hash: "ABC",
      status: "failed",
    });
  });
  it("does not turn policy denial into a payment receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Payment denied by policy." }), {
            status: 403,
          }),
        ),
    );
    await expect(
      purchaseService.submit({} as PaymentProposal),
    ).rejects.toBeInstanceOf(RequestError);
  });
  it.each([
    ["Find a chair under 8 XRP", 3, 3],
    ["Find a chair under 2 XRP", 5, 2],
    ["Find a chair", 5, 5],
    ["Find a chair no more than 2 XRP", 5, 2],
  ])(
    "enforces the lower launch ceiling for %s",
    (objective, budget, expected) => {
      expect(queryCatalog(buildObjective(objective, budget)).budgetXrp).toBe(
        expected,
      );
    },
  );
});

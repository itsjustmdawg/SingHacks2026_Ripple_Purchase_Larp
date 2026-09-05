import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateWebOffers, safeSourceUrl } from "./web";
import { readPlan, signPlan } from "./plan";
import type { SearchPlan } from "@/types/shopping";
const plan: SearchPlan = {
  item: "Mechanical keyboard",
  mode: "web",
  expiresAt: Date.now() + 60000,
  budget: {
    input: "20-40 USD",
    currency: "USD",
    min: 20,
    max: 40,
    minInclusive: true,
    maxInclusive: true,
    minXrp: 10,
    maxXrp: 20,
    xrpPerUnit: 0.5,
    rateAsOf: "2026-09-05",
    rateSource: "https://rates.example.test",
  },
};
const sources = [
    { title: "Retailer", url: "https://shop.example.test/keyboard" },
  ],
  rates = {
    date: "2026-09-05",
    source: "test",
    xrp: { usd: 2, xrp: 1, eur: 1.8 },
  };
beforeEach(() =>
  vi.stubEnv("AUTH_SECRET", "a-test-secret-with-more-than-32-characters"),
);
afterEach(() => vi.unstubAllEnvs());
describe("source-backed web offers", () => {
  it("converts and filters both price boundaries without adding payment recipients", () => {
    const offers = evaluateWebOffers(
      {
        offers: [15, 30, 60].map((amount, i) => ({
          title: "Keyboard " + i,
          provider: "Retailer",
          description: "Keyboard",
          amount,
          currency: "USD",
          sourceIndex: 0,
        })),
      },
      sources,
      plan,
      rates,
    );
    expect(offers[0]).toMatchObject({ priceXrp: 15, eligible: true });
    expect(offers.filter((o) => o.eligible)).toHaveLength(1);
    expect(offers[0]).not.toHaveProperty("recipient");
  });
  it("drops unsupported prices, currencies and ungrounded source indices", () =>
    expect(
      evaluateWebOffers(
        {
          offers: [
            {
              title: "Invented",
              provider: "X",
              description: "X",
              amount: 1,
              currency: "USD",
              sourceIndex: 99,
            },
            {
              title: "Token",
              provider: "X",
              description: "X",
              amount: 1,
              currency: "FAKE",
              sourceIndex: 0,
            },
          ],
        },
        sources,
        plan,
        rates,
      ),
    ).toEqual([]));
  it.each([
    "javascript:alert(1)",
    "http://shop.example.com",
    "https://127.0.0.1/a",
    "https://192.168.1.1",
    "https://user:pass@example.com",
    "https://site.local/a",
  ])("rejects unsafe link %s", (s) => expect(safeSourceUrl(s)).toBeNull());
  it("allows source URLs from Google grounding", () =>
    expect(
      safeSourceUrl(
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/example",
      ),
    ).toBeTruthy());
});
describe("signed price previews", () => {
  it("accepts genuine server previews", () =>
    expect(readPlan(signPlan(plan))).toEqual(plan));
  it("rejects tampered price plans", () =>
    expect(() => readPlan(signPlan(plan) + "x")).toThrow());
  it("rejects expired price plans", () =>
    expect(() => readPlan(signPlan({ ...plan, expiresAt: 1 }))).toThrow());
});

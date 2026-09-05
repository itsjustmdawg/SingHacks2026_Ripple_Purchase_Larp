import { describe, it, expect, vi } from "vitest";
import {
  parseSimplePrice,
  interpretPrice,
  convertBudget,
  validateIntent,
} from "./price";
import { validateRates, unitToXrp } from "./rates";
import type { PriceIntent } from "@/types/shopping";
const rates = {
  date: "2026-09-05",
  xrp: { xrp: 1, usd: 2, sgd: 2.5, eur: 1.8, btc: 0.00002, eth: 0.0005 },
  source: "https://rates.example.test",
};
describe("price interpretation", () => {
  it.each([
    ["max 100 SGD", { currency: "SGD", min: null, max: 100 }],
    ["between 20 and 50 EUR", { currency: "EUR", min: 20, max: 50 }],
    ["btwn 20 and 50 EUR", { currency: "EUR", min: 20, max: 50 }],
    ["SGD 100-250", { currency: "SGD", min: 100, max: 250 }],
    ["min 0.001 BTC", { currency: "BTC", min: 0.001, max: null }],
    ["at least 10 USD", { currency: "USD", min: 10, max: null }],
    ["no more than 50 USD", { currency: "USD", min: null, max: 50 }],
    ["not more than 200 SGD", { currency: "SGD", min: null, max: 200 }],
    [
      "not less than 20 EUR",
      { currency: "EUR", min: 20, max: null, minInclusive: true },
    ],
    ["5 XRP", { currency: "XRP", min: null, max: 5 }],
    ["max 1,000 USD", { currency: "USD", max: 1000 }],
    ["max 500 min 200 SGD", { currency: "SGD", min: 200, max: 500 }],
    ["under 5 XRP", { currency: "XRP", max: 5, maxInclusive: false }],
    ["over 1 ETH", { currency: "ETH", min: 1, minInclusive: false }],
    ["max €50", { currency: "EUR", max: 50 }],
    ["max S$50", { currency: "SGD", max: 50 }],
    ["max 50 USDT", { currency: "USDT", max: 50 }],
  ])("parses %s", (input, expected) =>
    expect(parseSimplePrice(input)).toMatchObject(expected),
  );
  it.each([
    "max $50",
    "between 100 and 20 SGD",
    "-5 XRP",
    "min 10 USD max 20 SGD",
    "max 0 XRP",
  ])("requires clarification for %s", (s) =>
    expect(() => parseSimplePrice(s)).toThrow(),
  );
  it("does not silently parse magnitude words as units", () =>
    expect(parseSimplePrice("max 2k SGD")).toBeNull());
  it("delegates complex text to the bounded interpreter", async () => {
    const model = {
      model: "test",
      generateJson: vi
        .fn()
        .mockResolvedValue({
          currency: "SGD",
          min: null,
          max: 2000,
          minInclusive: true,
          maxInclusive: true,
          clarification: "",
        }),
    };
    expect(
      await interpretPrice("max two thousand singapore dollars", model),
    ).toMatchObject({ max: 2000 });
    expect(model.generateJson).toHaveBeenCalledOnce();
  });
  it("rejects invalid model amounts", () =>
    expect(() =>
      validateIntent({
        currency: "BTC",
        min: NaN,
        max: null,
        minInclusive: true,
        maxInclusive: true,
      }),
    ).toThrow());
});
describe("currency conversion", () => {
  const intent: PriceIntent = {
    currency: "SGD",
    min: 100,
    max: 250,
    minInclusive: true,
    maxInclusive: true,
  };
  it("converts original lower and upper amounts using reciprocal XRP rates", async () =>
    expect(await convertBudget("100-250 SGD", intent, rates)).toMatchObject({
      minXrp: 40,
      maxXrp: 100,
      xrpPerUnit: 0.4,
      rateAsOf: "2026-09-05",
    }));
  it("converts crypto and preserves a minimum-only request", async () =>
    expect(
      await convertBudget(
        "min 0.001 BTC",
        { ...intent, currency: "BTC", min: 0.001, max: null },
        rates,
      ),
    ).toMatchObject({ minXrp: 50, maxXrp: null }));
  it("preserves strict boundaries without exceeding a ceiling", async () =>
    expect(
      await convertBudget("under 5 XRP", {
        ...intent,
        currency: "XRP",
        min: null,
        max: 5,
        maxInclusive: false,
      }),
    ).toMatchObject({ maxXrp: 4.999999 }));
  it("rounds minimum up and maximum down to drops", async () =>
    expect(
      await convertBudget(
        "range",
        { ...intent, currency: "USD", min: 0.000003, max: 0.000009 },
        rates,
      ),
    ).toMatchObject({ minXrp: 0.000002, maxXrp: 0.000004 }));
  it("rejects sub-drop ranges", async () =>
    await expect(
      convertBudget("max 0.0000001 XRP", {
        ...intent,
        currency: "XRP",
        min: null,
        max: 0.0000001,
      }),
    ).rejects.toThrow());
  it("does not invent a rate for unknown tokens", () =>
    expect(() => unitToXrp("FAKECOIN", rates)).toThrow());
  it("rejects stale rate data", () =>
    expect(() =>
      validateRates(rates, rates.source, Date.parse("2026-09-10")),
    ).toThrow());
  it("accepts a fresh rate snapshot", () =>
    expect(
      validateRates(rates, rates.source, Date.parse("2026-09-05T12:00:00Z")).xrp
        .sgd,
    ).toBe(2.5));
});

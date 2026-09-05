import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PriceFields } from "./PriceFields";
import { BudgetPreview } from "./BudgetPreview";
describe("shopping form rendering", () => {
  it("renders exactly two separately labeled inputs and preserves arbitrary price text", () => {
    const html = renderToStaticMarkup(
      createElement(PriceFields, {
        item: "Headphones",
        pricing: "between 100 and 200 SGD",
        onItem: () => {},
        onPricing: () => {},
      }),
    );
    expect(html.match(/<textarea/g)).toHaveLength(2);
    expect(html).toContain("shopping-item");
    expect(html).toContain("shopping-price");
    expect(html).toContain("between 100 and 200 SGD");
  });
  it("locks both inputs while research or payment is active", () => {
    const html = renderToStaticMarkup(
      createElement(PriceFields, {
        item: "Chair",
        pricing: "5 XRP",
        onItem: () => {},
        onPricing: () => {},
        disabled: true,
      }),
    );
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
  it("does not render infinity or an invented maximum for minimum-only prices", () => {
    const html = renderToStaticMarkup(
      createElement(BudgetPreview, {
        budget: {
          input: "min 2 XRP",
          currency: "XRP",
          min: 2,
          max: null,
          minXrp: 2,
          maxXrp: null,
          minInclusive: true,
          maxInclusive: true,
          xrpPerUnit: 1,
          rateAsOf: "2026-09-05",
          rateSource: "Native XRP",
        },
      }),
    );
    expect(html).toContain("At least 2");
    expect(html).not.toContain("Infinity");
  });
});

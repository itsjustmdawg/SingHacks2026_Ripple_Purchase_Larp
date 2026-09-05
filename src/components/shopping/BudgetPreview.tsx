import type { PriceBudget } from "@/types/shopping";
import { formatXrp } from "@/services/purchase";
export function BudgetPreview({ budget }: { budget: PriceBudget }) {
  const range =
    budget.minXrp !== null && budget.maxXrp !== null
      ? formatXrp(budget.minXrp) + " – " + formatXrp(budget.maxXrp)
      : budget.minXrp !== null
        ? "At least " + formatXrp(budget.minXrp)
        : "Up to " + formatXrp(budget.maxXrp ?? 0);
  return (
    <div className="budget-preview" role="status">
      <span className="micro">YOUR AGENTS’ PRICE RANGE</span>
      <strong>{range} XRP</strong>
      <p>You entered: {budget.input}</p>
      <small>
        {budget.currency === "XRP" ? (
          "Native XRP; no exchange rate needed."
        ) : (
          <>
            1 {budget.currency} ≈ {formatXrp(budget.xrpPerUnit)} XRP · Daily
            reference rates dated {budget.rateAsOf}.{" "}
            <a href={budget.rateSource} target="_blank" rel="noreferrer">
              Rate source ↗
            </a>{" "}
            Not a tradable exchange quote; merchant prices, tax and shipping may
            change.
          </>
        )}
      </small>
    </div>
  );
}

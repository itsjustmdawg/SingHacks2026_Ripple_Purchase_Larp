"use client";
export function PriceFields({
  item,
  pricing,
  onItem,
  onPricing,
  disabled = false,
}: {
  item: string;
  pricing: string;
  onItem: (value: string) => void;
  onPricing: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="shopping-fields">
      <label className="field">
        1. What do you want or need?
        <textarea
          id="shopping-item"
          required
          maxLength={1700}
          disabled={disabled}
          value={item}
          onChange={(e) => onItem(e.target.value)}
          placeholder="An ergonomic office chair with adjustable lumbar support"
        />
      </label>
      <label className="field">
        2. What is your price requirement?
        <textarea
          id="shopping-price"
          required
          maxLength={400}
          disabled={disabled}
          value={pricing}
          onChange={(e) => onPricing(e.target.value)}
          placeholder="Between 100 and 250 SGD, max 80 USD, or min 0.001 BTC"
          aria-describedby="price-help"
        />
      </label>
      <p id="price-help" className="notice-inline">
        Use a maximum, minimum or range in a fiat currency or crypto. A bare
        amount means a maximum. We show the XRP interpretation before research;
        ambiguous or unavailable currencies need clarification.
      </p>
    </div>
  );
}

import { ShoppingError } from "./errors";
export interface RateTable {
  date: string;
  xrp: Record<string, number>;
  source: string;
}
const urls = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xrp.min.json",
  "https://latest.currency-api.pages.dev/v1/currencies/xrp.min.json",
];
let cached: { table: RateTable; until: number } | undefined;
export function validateRates(
  raw: unknown,
  source: string,
  now = Date.now(),
): RateTable {
  const data = raw as { date?: unknown; xrp?: Record<string, unknown> };
  const date = typeof data?.date === "string" ? data.date : "";
  const stamp = Date.parse(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(stamp) ||
    now - stamp > 72 * 3600000 ||
    stamp > now + 86400000 ||
    !data.xrp ||
    typeof data.xrp !== "object"
  )
    throw Error("Stale or invalid rates");
  const xrp: Record<string, number> = {};
  for (const [code, n] of Object.entries(data.xrp))
    if (
      /^[a-z0-9]{2,15}$/.test(code) &&
      typeof n === "number" &&
      Number.isFinite(n) &&
      n > 0
    )
      xrp[code] = n;
  if (!xrp.usd || !xrp.eur) throw Error("Incomplete rates");
  xrp.xrp = 1;
  return { date, xrp, source };
}
export async function getRates(): Promise<RateTable> {
  if (cached && cached.until > Date.now()) return cached.table;
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!r.ok) continue;
      const table = validateRates(await r.json(), url);
      cached = { table, until: Date.now() + 600000 };
      return table;
    } catch {
      /* Try independent mirror; never invent an exchange rate. */
    }
  }
  throw new ShoppingError(
    "Currency rates are unavailable or out of date.",
    "Retry shortly, or enter your price directly in XRP.",
    "RATES_UNAVAILABLE",
    503,
  );
}
export function unitToXrp(currency: string, table: RateTable): number {
  const n = table.xrp[currency.toLowerCase()];
  if (!n)
    throw new ShoppingError(
      "No supported rate was found for " + currency + ".",
      "Use an explicit supported currency code such as SGD, USD, EUR, BTC, ETH or XRP. Unlisted tokens cannot be converted safely.",
      "CURRENCY_UNSUPPORTED",
    );
  return 1 / n;
}

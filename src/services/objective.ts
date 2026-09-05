/** Canonical ceiling goes first so existing deterministic and Gemini parsing agree. */
export function buildObjective(objective: string, budget: number) {
  const limits = [
    ...objective.matchAll(
      /\b(?:under|below|within|up to|max(?:imum)?(?: of)?|budget(?: of)?|less than|no more than)\s+(?:XRP\s*)?(\d+(?:\.\d{1,6})?)\s*(?:XRP)?\b/gi,
    ),
  ]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  const ceiling = Math.min(budget, ...limits);
  return "Maximum of " + ceiling + " XRP. " + objective.trim();
}

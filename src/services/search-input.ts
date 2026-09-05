// Migrate old demo links that embedded an XRP ceiling in the objective.
export function initialSearchInput(objective: string, pricing?: string) {
  if (pricing) return { item: objective, pricing };
  const m =
    /\s+((?:under|below|up to|max(?:imum)?(?: of)?|budget(?: of)?)\s+\d+(?:\.\d+)?\s*XRP)\b/i.exec(
      objective,
    );
  return m
    ? {
        item: (
          objective.slice(0, m.index) + objective.slice(m.index + m[0].length)
        ).trim(),
        pricing: m[1],
      }
    : { item: objective, pricing: "" };
}

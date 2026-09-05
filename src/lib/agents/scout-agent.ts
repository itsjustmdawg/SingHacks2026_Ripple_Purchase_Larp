import { queryCatalog } from "@/lib/catalog";
import type { AgentRequest, AgentTraceEvent, CatalogSearchResult } from "@/types";

export interface ScoutAgentResult {
  catalog: CatalogSearchResult;
  trace: AgentTraceEvent;
}

export function runScoutAgent(
  request: AgentRequest,
  timestamp: string,
): ScoutAgentResult {
  const catalog = queryCatalog(request.userMessage);
  const categoryLabel = catalog.category === "any" ? "catalog" : catalog.category;
  const offers = catalog.offers
    .map((offer) => `${offer.provider} (${offer.priceXrp} XRP)`)
    .join(", ");

  return {
    catalog,
    trace: {
      id: `${request.id}:scout`,
      agent: "market_scout",
      label: "Market Scout",
      status: "completed",
      message:
        catalog.offers.length > 0
          ? `Found ${catalog.offers.length} ${categoryLabel} offers: ${offers}.`
          : `No ${categoryLabel} offers matched the objective.`,
      timestamp,
    },
  };
}

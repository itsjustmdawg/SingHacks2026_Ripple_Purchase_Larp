import { listCatalogOffers, queryCatalog } from "@/lib/catalog";
import type {
  AgentRequest,
  AgentTraceEvent,
  CatalogCategory,
  CatalogOffer,
  CatalogSearchResult,
} from "@/types";

import type { ProcurementAgentModel } from "./procurement-model";

export interface ScoutAgentResult {
  catalog: CatalogSearchResult;
  trace: AgentTraceEvent;
}

function categoryForOffers(
  offers: readonly CatalogOffer[],
): CatalogCategory | "mixed" | "unknown" {
  const categories = new Set(offers.map((offer) => offer.category));
  if (categories.size === 0) return "unknown";
  if (categories.size > 1) return "mixed";
  return categories.values().next().value ?? "unknown";
}

function formatOffers(offers: readonly CatalogOffer[]): string {
  return offers
    .map((offer) => `${offer.provider} (${offer.priceXrp} XRP)`)
    .join(", ");
}

export async function runScoutAgent(
  request: AgentRequest,
  timestamp: string,
  model: ProcurementAgentModel | null = null,
): Promise<ScoutAgentResult> {
  const deterministicCatalog = queryCatalog(request.userMessage);
  let catalog = deterministicCatalog;
  let engine: AgentTraceEvent["engine"] = "deterministic";
  let modelName: string | undefined;
  let decisionSummary = "";

  if (model) {
    try {
      const allOffers = listCatalogOffers();
      const decision = await model.scout(request.userMessage, allOffers);
      const matchingIds = new Set(decision.matchingOfferIds);
      const matchingOffers = allOffers.filter((offer) => matchingIds.has(offer.id));
      catalog = {
        category: categoryForOffers(matchingOffers),
        budgetXrp: deterministicCatalog.budgetXrp ?? decision.budgetXrp,
        offers: matchingOffers,
      };
      engine = "gemini";
      modelName = model.model;
      decisionSummary = ` ${decision.summary}`;
    } catch {
      decisionSummary = " Gemini was unavailable, so the safe catalog matcher was used.";
    }
  }

  const categoryLabel =
    catalog.category === "unknown" || catalog.category === "mixed"
      ? "catalog"
      : catalog.category;

  return {
    catalog,
    trace: {
      id: `${request.id}:scout`,
      agent: "market_scout",
      label: "Market Scout",
      status: catalog.offers.length > 0 ? "completed" : "denied",
      engine,
      model: modelName,
      message:
        catalog.offers.length > 0
          ? `Found ${catalog.offers.length} ${categoryLabel} offers: ${formatOffers(catalog.offers)}.${decisionSummary}`
          : `No catalog offers matched the requested product or service.${decisionSummary}`,
      timestamp,
    },
  };
}

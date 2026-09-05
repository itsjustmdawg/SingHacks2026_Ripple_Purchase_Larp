import type {
  AgentRequest,
  AgentTraceEvent,
  CatalogOffer,
  CatalogSearchResult,
  DealAnalysis,
  QuoteEvaluation,
} from "@/types";

import type { ProcurementAgentModel } from "./procurement-model";

export interface DealAnalystAgentResult {
  analysis: DealAnalysis;
  trace: AgentTraceEvent;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function scoreOffer(offer: CatalogOffer, priceCeiling: number): number {
  const uptimeScore = Math.max(0, Math.min((offer.uptimePercent - 99) / 1, 1));
  const latencyScore = Math.max(
    0,
    Math.min((300 - offer.responseTimeMs) / 300, 1),
  );
  const valueScore = Math.max(
    0,
    Math.min((priceCeiling - offer.priceXrp) / priceCeiling, 1),
  );

  return roundScore(
    offer.reliabilityScore * 45 +
      uptimeScore * 25 +
      latencyScore * 10 +
      valueScore * 20,
  );
}

export async function runDealAnalystAgent(
  request: AgentRequest,
  catalog: CatalogSearchResult,
  timestamp: string,
  model: ProcurementAgentModel | null = null,
): Promise<DealAnalystAgentResult> {
  const maxCatalogPrice = Math.max(
    ...catalog.offers.map((offer) => offer.priceXrp),
    1,
  );
  const priceCeiling = catalog.budgetXrp ?? maxCatalogPrice;

  const evaluations: QuoteEvaluation[] = catalog.offers.map((offer) => {
    const eligible =
      (catalog.budgetXrp === null || offer.priceXrp <= catalog.budgetXrp) &&
      (catalog.minBudgetXrp == null || offer.priceXrp >= catalog.minBudgetXrp);
    return {
      offerId: offer.id,
      eligible,
      score: eligible ? scoreOffer(offer, priceCeiling) : null,
      summary: eligible
        ? `${offer.uptimePercent}% uptime, ${offer.responseTimeMs} ms response, ${offer.priceXrp} XRP.`
        : `${offer.priceXrp} XRP is outside the requested range (${catalog.minBudgetXrp ?? 0} to ${catalog.budgetXrp ?? "no maximum"} XRP).`,
    };
  });

  const ranked = evaluations
    .filter(
      (evaluation): evaluation is QuoteEvaluation & { score: number } =>
        evaluation.eligible && evaluation.score !== null,
    )
    .sort((left, right) => right.score - left.score);
  let selectedEvaluation = ranked[0] ?? null;
  let engine: AgentTraceEvent["engine"] = "deterministic";
  let modelName: string | undefined;
  let modelSummary = "";

  if (model && ranked.length > 0) {
    try {
      const decision = await model.analyze(
        request.userMessage,
        catalog.offers,
        evaluations,
      );
      selectedEvaluation =
        ranked.find(
          (evaluation) => evaluation.offerId === decision.selectedOfferId,
        ) ?? selectedEvaluation;
      engine = "gemini";
      modelName = model.model;
      modelSummary = ` ${decision.summary}`;
    } catch {
      modelSummary =
        " Gemini was unavailable, so validated scoring selected the offer.";
    }
  }
  const selectedOffer = selectedEvaluation
    ? (catalog.offers.find(
        (offer) => offer.id === selectedEvaluation.offerId,
      ) ?? null)
    : null;
  const excludedProviders = evaluations
    .filter((evaluation) => !evaluation.eligible)
    .map((evaluation) => {
      const offer = catalog.offers.find(
        (candidate) => candidate.id === evaluation.offerId,
      );
      return offer?.provider;
    })
    .filter((provider): provider is string => Boolean(provider));

  const budgetSummary =
    excludedProviders.length > 0
      ? ` Excluded ${excludedProviders.join(", ")} for exceeding the user budget.`
      : "";
  const message =
    selectedOffer && selectedEvaluation
      ? `Selected ${selectedOffer.provider} at ${selectedOffer.priceXrp} XRP with a ${selectedEvaluation.score}/100 validated score.${budgetSummary}${modelSummary}`
      : `No offer satisfied the objective${catalog.budgetXrp === null ? "" : ` within ${catalog.budgetXrp} XRP`}.`;

  return {
    analysis: { selectedOffer, evaluations },
    trace: {
      id: `${request.id}:analyst`,
      agent: "deal_analyst",
      label: "Deal Analyst",
      status: selectedOffer ? "completed" : "denied",
      engine,
      model: modelName,
      message,
      timestamp,
    },
  };
}

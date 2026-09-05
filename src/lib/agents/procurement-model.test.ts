import { describe, expect, it, vi } from "vitest";

import { listCatalogOffers } from "@/lib/catalog";
import type { GeminiJsonGenerator } from "@/lib/gemini";

import {
  GeminiProcurementModel,
  ProcurementModelOutputError,
  validateAnalystModelDecision,
  validateScoutModelDecision,
} from "./procurement-model";

describe("procurement model validation", () => {
  it("rejects catalog IDs invented by the scout", () => {
    expect(() =>
      validateScoutModelDecision(
        {
          matchingOfferIds: ["invented-offer"],
          budgetXrp: 5,
          summary: "Found a chair.",
        },
        new Set(["furniture-ergoflow"]),
      ),
    ).toThrow(ProcurementModelOutputError);
  });

  it("rejects an analyst selection outside the eligible set", () => {
    expect(() =>
      validateAnalystModelDecision(
        {
          selectedOfferId: "furniture-aeronova",
          summary: "Selected premium chair.",
          confidence: 0.9,
        },
        new Set(["furniture-ergoflow"]),
      ),
    ).toThrow(ProcurementModelOutputError);
  });
});

describe("GeminiProcurementModel", () => {
  it("uses separate structured calls for scouting and analysis", async () => {
    const generateJson = vi
      .fn()
      .mockResolvedValueOnce({
        matchingOfferIds: ["furniture-ergoflow", "furniture-seatcraft"],
        budgetXrp: 5,
        summary: "Matched office chairs.",
      })
      .mockResolvedValueOnce({
        selectedOfferId: "furniture-ergoflow",
        summary: "Best balance of comfort and reliability.",
        confidence: 0.94,
      });
    const client: GeminiJsonGenerator = {
      model: "gemini-test",
      generateJson,
    };
    const model = new GeminiProcurementModel(client);
    const chairs = listCatalogOffers().filter(
      (offer) => offer.category === "furniture",
    );

    const scout = await model.scout("Find the best chair under 5 XRP", chairs);
    const analyst = await model.analyze(
      "Find the best chair under 5 XRP",
      chairs,
      chairs.map((offer) => ({
        offerId: offer.id,
        eligible: offer.priceXrp <= 5,
        score: offer.priceXrp <= 5 ? 80 : null,
        summary: "Validated quote.",
      })),
    );

    expect(scout.matchingOfferIds).toHaveLength(2);
    expect(analyst.selectedOfferId).toBe("furniture-ergoflow");
    expect(generateJson).toHaveBeenCalledTimes(2);
  });
});

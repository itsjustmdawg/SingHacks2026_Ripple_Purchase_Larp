import { describe, expect, it } from "vitest";

import { listCatalogOffers, queryCatalog } from "./catalog";

describe("mock catalog", () => {
  it("finds the relevant service category and user-stated budget", () => {
    const result = queryCatalog("Find encrypted cloud storage under 5 XRP");

    expect(result.category).toBe("storage");
    expect(result.budgetXrp).toBe(5);
    expect(result.offers.map((offer) => offer.provider)).toEqual([
      "CloudDrop",
      "StoriXRPL",
      "FileNet",
      "ShareDesk Cloud",
      "SafeVault",
    ]);
  });

  it("returns defensive copies of catalog records", () => {
    const first = listCatalogOffers();
    (first[0].features as string[])[0] = "mutated";

    expect(listCatalogOffers()[0].features[0]).toBe("encryption");
  });

  it("returns chair offers instead of unrelated services", () => {
    const result = queryCatalog("Find the best chair under 5 XRP");

    expect(result.category).toBe("furniture");
    expect(result.budgetXrp).toBe(5);
    expect(result.offers.map((offer) => offer.provider)).toEqual([
      "ErgoFlow",
      "SeatCraft",
      "AeroNova",
    ]);
  });

  it("returns AI debugger offers for engineering team requests", () => {
    const result = queryCatalog(
      "Find an AI debugger for my company team under 5 XRP",
    );

    expect(result.category).toBe("debugging");
    expect(result.budgetXrp).toBe(5);
    expect(result.offers.map((offer) => offer.provider)).toEqual([
      "FixFlow",
      "BugLens",
      "TracePilot",
      "SafePatch",
    ]);
    expect(result.offers[0].valueMetrics).toContain("2,000 prompts");
  });

  it("returns defensive copies of value metrics", () => {
    const first = listCatalogOffers();
    (first[0].valueMetrics as string[])[0] = "mutated";

    expect(listCatalogOffers()[0].valueMetrics[0]).toBe("500 GB included");
  });

  it("returns no offers for an unsupported product", () => {
    const result = queryCatalog("Find the best pizza under 5 XRP");

    expect(result.category).toBe("unknown");
    expect(result.offers).toEqual([]);
  });
});

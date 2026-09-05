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
    ]);
  });

  it("returns defensive copies of catalog records", () => {
    const first = listCatalogOffers();
    (first[0].features as string[])[0] = "mutated";

    expect(listCatalogOffers()[0].features[0]).toBe("encryption");
  });
});

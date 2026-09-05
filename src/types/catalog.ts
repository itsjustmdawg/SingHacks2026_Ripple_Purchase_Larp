export type CatalogCategory = "storage" | "api" | "compute" | "analytics";

export interface CatalogOffer {
  id: string;
  provider: string;
  service: string;
  category: CatalogCategory;
  description: string;
  priceXrp: number;
  recipient: string;
  uptimePercent: number;
  responseTimeMs: number;
  reliabilityScore: number;
  features: readonly string[];
}

export interface CatalogSearchResult {
  category: CatalogCategory | "any";
  budgetXrp: number | null;
  offers: CatalogOffer[];
}

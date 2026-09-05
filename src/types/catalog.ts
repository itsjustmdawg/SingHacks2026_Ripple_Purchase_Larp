export type CatalogCategory =
  "storage" | "api" | "compute" | "analytics" | "furniture";

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
  minBudgetXrp?: number | null;
  category: CatalogCategory | "mixed" | "unknown";
  budgetXrp: number | null;
  offers: CatalogOffer[];
}

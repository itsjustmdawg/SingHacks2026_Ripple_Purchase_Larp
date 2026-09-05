import type {
  CatalogCategory,
  CatalogOffer,
  CatalogSearchResult,
} from "@/types";

// Public XRPL addresses only. The catalog never contains seeds or signing keys.
const CATALOG_OFFERS: readonly CatalogOffer[] = [
  {
    id: "storage-clouddrop",
    provider: "CloudDrop",
    service: "Encrypted Storage Pro",
    category: "storage",
    description: "Encrypted object storage with regional replication.",
    priceXrp: 3.8,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.99,
    responseTimeMs: 120,
    reliabilityScore: 0.98,
    features: ["encryption", "replication", "audit logs"],
  },
  {
    id: "storage-storixrpl",
    provider: "StoriXRPL",
    service: "Ledger Storage Plus",
    category: "storage",
    description: "Versioned storage with XRPL payment receipts.",
    priceXrp: 4.2,
    recipient: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    uptimePercent: 99.95,
    responseTimeMs: 175,
    reliabilityScore: 0.95,
    features: ["versioning", "receipts", "daily backups"],
  },
  {
    id: "storage-filenet",
    provider: "FileNet",
    service: "Archive Enterprise",
    category: "storage",
    description: "Long-term archival storage with priority support.",
    priceXrp: 6,
    recipient: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    uptimePercent: 99.9,
    responseTimeMs: 240,
    reliabilityScore: 0.92,
    features: ["archival", "priority support", "retention policies"],
  },
  {
    id: "api-pulse",
    provider: "PulseAPI",
    service: "10,000 API Credits",
    category: "api",
    description: "Low-latency API credits with usage analytics.",
    priceXrp: 4.4,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.98,
    responseTimeMs: 85,
    reliabilityScore: 0.97,
    features: ["usage analytics", "rate-limit alerts", "REST"],
  },
  {
    id: "api-datastream",
    provider: "DataStream",
    service: "Developer API Pack",
    category: "api",
    description: "General-purpose data API bundle for prototypes.",
    priceXrp: 3.9,
    recipient: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    uptimePercent: 99.92,
    responseTimeMs: 110,
    reliabilityScore: 0.94,
    features: ["REST", "webhooks", "sandbox"],
  },
  {
    id: "compute-nebula",
    provider: "NebulaCompute",
    service: "GPU Burst Hour",
    category: "compute",
    description: "On-demand GPU compute for inference workloads.",
    priceXrp: 4.7,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.97,
    responseTimeMs: 95,
    reliabilityScore: 0.96,
    features: ["GPU", "autoscaling", "container runtime"],
  },
  {
    id: "compute-edgeforge",
    provider: "EdgeForge",
    service: "Edge Compute Pack",
    category: "compute",
    description: "Distributed CPU compute close to regional users.",
    priceXrp: 3.6,
    recipient: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    uptimePercent: 99.9,
    responseTimeMs: 70,
    reliabilityScore: 0.93,
    features: ["edge regions", "containers", "autoscaling"],
  },
  {
    id: "analytics-signal",
    provider: "SignalWorks",
    service: "Market Analytics Month",
    category: "analytics",
    description: "A month of market dashboards and anomaly alerts.",
    priceXrp: 4.1,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.96,
    responseTimeMs: 105,
    reliabilityScore: 0.96,
    features: ["dashboards", "alerts", "exports"],
  },
];

const CATEGORY_KEYWORDS: Readonly<Record<CatalogCategory, readonly string[]>> = {
  storage: ["storage", "cloud", "backup", "archive", "file"],
  api: ["api", "credits", "endpoint", "developer pack"],
  compute: ["compute", "gpu", "cpu", "inference", "server"],
  analytics: ["analytics", "market data", "dashboard", "insight"],
};

const BUDGET_PATTERNS = [
  /\b(?:under|below|within|up to|max(?:imum)?(?: of)?|budget(?: of)?)\s+(?:XRP\s*)?(\d+(?:\.\d{1,6})?)\s*(?:XRP)?\b/i,
  /\b(?:less than|no more than)\s+(?:XRP\s*)?(\d+(?:\.\d{1,6})?)\s*(?:XRP)?\b/i,
] as const;

function inferCategory(objective: string): CatalogCategory | "any" {
  const normalized = objective.toLowerCase();
  let best: { category: CatalogCategory; matches: number } | null = null;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    CatalogCategory,
    readonly string[],
  ][]) {
    const matches = keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (matches > 0 && (best === null || matches > best.matches)) {
      best = { category, matches };
    }
  }

  return best?.category ?? "any";
}

function extractBudget(objective: string): number | null {
  for (const pattern of BUDGET_PATTERNS) {
    const match = pattern.exec(objective);
    if (!match) continue;

    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

export function queryCatalog(objective: string): CatalogSearchResult {
  const category = inferCategory(objective);
  const offers = CATALOG_OFFERS.filter(
    (offer) => category === "any" || offer.category === category,
  ).map((offer) => ({ ...offer, features: [...offer.features] }));

  return {
    category,
    budgetXrp: extractBudget(objective),
    offers,
  };
}

export function listCatalogOffers(): CatalogOffer[] {
  return CATALOG_OFFERS.map((offer) => ({
    ...offer,
    features: [...offer.features],
  }));
}

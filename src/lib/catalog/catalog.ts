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
    valueMetrics: ["500 GB included", "10 staff seats", "Hourly backups"],
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
    valueMetrics: ["1 TB archive", "Unlimited versions", "Daily restore points"],
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
    valueMetrics: ["2 TB retention", "4-hour support SLA", "7-year archive rules"],
  },
  {
    id: "storage-sharedesk",
    provider: "ShareDesk Cloud",
    service: "Team File Vault",
    category: "storage",
    description: "Shared file workspace for invoices, media, and staff folders.",
    priceXrp: 2.9,
    recipient: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    uptimePercent: 99.93,
    responseTimeMs: 160,
    reliabilityScore: 0.94,
    features: ["staff folders", "share links", "permission groups"],
    valueMetrics: ["250 GB included", "8 staff seats", "30-day file history"],
  },
  {
    id: "storage-safevault",
    provider: "SafeVault",
    service: "Compliance Storage Starter",
    category: "storage",
    description: "Encrypted storage with access reports for regulated teams.",
    priceXrp: 4.9,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.97,
    responseTimeMs: 135,
    reliabilityScore: 0.97,
    features: ["access reports", "encryption", "admin approvals"],
    valueMetrics: ["750 GB included", "15 staff seats", "Weekly report"],
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
    valueMetrics: ["10,000 calls", "85 ms response", "Usage alerts"],
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
    valueMetrics: ["8,000 calls", "Webhook support", "Sandbox keys"],
  },
  {
    id: "api-bridgekit",
    provider: "BridgeKit",
    service: "Integration API Month",
    category: "api",
    description: "API credits for syncing orders, forms, and customer tools.",
    priceXrp: 3.4,
    recipient: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    uptimePercent: 99.9,
    responseTimeMs: 130,
    reliabilityScore: 0.93,
    features: ["order sync", "forms API", "basic analytics"],
    valueMetrics: ["6,500 calls", "25 workflows", "Email support"],
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
    valueMetrics: ["1 GPU hour", "Autoscale on demand", "Container deploys"],
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
    valueMetrics: ["12 CPU hours", "70 ms response", "3 edge regions"],
  },
  {
    id: "compute-promptforge",
    provider: "PromptForge",
    service: "AI Batch Runner",
    category: "compute",
    description: "Batch compute for AI prompts, reports, and nightly jobs.",
    priceXrp: 4.2,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.94,
    responseTimeMs: 115,
    reliabilityScore: 0.95,
    features: ["batch jobs", "queue retries", "usage export"],
    valueMetrics: ["2,000 prompt jobs", "10 queues", "CSV usage export"],
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
    valueMetrics: ["30 reports/month", "5 dashboards", "Slack alerts"],
  },
  {
    id: "analytics-growthlens",
    provider: "GrowthLens",
    service: "Marketing Reports Plus",
    category: "analytics",
    description: "Campaign reports with weekly summaries and spend tracking.",
    priceXrp: 3.2,
    recipient: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    uptimePercent: 99.91,
    responseTimeMs: 150,
    reliabilityScore: 0.93,
    features: ["campaign reports", "spend tracking", "weekly summaries"],
    valueMetrics: ["12 channel reports", "4 summaries", "3 users"],
  },
  {
    id: "analytics-shopradar",
    provider: "ShopRadar",
    service: "Retail Insight Month",
    category: "analytics",
    description: "Sales trend reports for small retail and ecommerce teams.",
    priceXrp: 4.6,
    recipient: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    uptimePercent: 99.94,
    responseTimeMs: 125,
    reliabilityScore: 0.95,
    features: ["sales trends", "inventory alerts", "CSV exports"],
    valueMetrics: ["20 sales reports", "8 alert rules", "Daily export"],
  },
  {
    id: "furniture-ergoflow",
    provider: "ErgoFlow",
    service: "Ergonomic Mesh Chair",
    category: "furniture",
    description: "Adjustable office chair with lumbar support and mesh back.",
    priceXrp: 4.6,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.8,
    responseTimeMs: 140,
    reliabilityScore: 0.97,
    features: ["lumbar support", "adjustable arms", "mesh back"],
    valueMetrics: ["12-month warranty", "120 kg rated", "3 adjustments"],
  },
  {
    id: "furniture-seatcraft",
    provider: "SeatCraft",
    service: "Essential Office Chair",
    category: "furniture",
    description: "Affordable task chair for compact workspaces.",
    priceXrp: 3.2,
    recipient: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    uptimePercent: 99.5,
    responseTimeMs: 190,
    reliabilityScore: 0.9,
    features: ["height adjustment", "compact", "padded seat"],
    valueMetrics: ["6-month warranty", "100 kg rated", "Compact size"],
  },
  {
    id: "furniture-aeronova",
    provider: "AeroNova",
    service: "Executive Smart Chair",
    category: "furniture",
    description: "Premium posture-tracking chair with extended warranty.",
    priceXrp: 6.8,
    recipient: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    uptimePercent: 99.95,
    responseTimeMs: 105,
    reliabilityScore: 0.98,
    features: ["posture tracking", "premium lumbar support", "warranty"],
    valueMetrics: ["24-month warranty", "Posture sensor", "Premium support"],
  },
  {
    id: "debugging-fixflow",
    provider: "FixFlow",
    service: "Team AI Debugger",
    category: "debugging",
    description: "AI debugging assistant for team code reviews and incident fixes.",
    priceXrp: 3.7,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.96,
    responseTimeMs: 100,
    reliabilityScore: 0.97,
    features: ["repo scans", "test suggestions", "team history"],
    valueMetrics: ["2,000 prompts", "5 repos", "8 seats"],
  },
  {
    id: "debugging-buglens",
    provider: "BugLens",
    service: "Debugger Lite",
    category: "debugging",
    description: "Affordable bug explanations and stack trace summaries.",
    priceXrp: 1.8,
    recipient: "rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv",
    uptimePercent: 99.88,
    responseTimeMs: 180,
    reliabilityScore: 0.91,
    features: ["stack traces", "basic prompts", "single repo"],
    valueMetrics: ["500 prompts", "1 repo", "2 seats"],
  },
  {
    id: "debugging-tracepilot",
    provider: "TracePilot",
    service: "Production Debug Pro",
    category: "debugging",
    description: "Debugging workspace for logs, traces, and pull request fixes.",
    priceXrp: 4.8,
    recipient: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    uptimePercent: 99.99,
    responseTimeMs: 90,
    reliabilityScore: 0.98,
    features: ["trace search", "PR fix drafts", "incident summaries"],
    valueMetrics: ["3,500 prompts", "10 repos", "15 seats"],
  },
  {
    id: "debugging-safepatch",
    provider: "SafePatch",
    service: "Secure Debug Review",
    category: "debugging",
    description: "Security-focused debugger with vulnerability notes before fixes.",
    priceXrp: 4.1,
    recipient: "rJn2prkitEBcrzLZhzVQkeTzDgaF9VxY7c",
    uptimePercent: 99.94,
    responseTimeMs: 130,
    reliabilityScore: 0.96,
    features: ["security checks", "fix review", "audit notes"],
    valueMetrics: ["1,800 prompts", "6 repos", "Security notes"],
  },
];

const CATEGORY_KEYWORDS: Readonly<Record<CatalogCategory, readonly string[]>> = {
  storage: ["storage", "cloud", "backup", "archive", "file"],
  api: ["api", "credits", "endpoint", "developer pack"],
  compute: ["compute", "gpu", "cpu", "inference", "server"],
  analytics: ["analytics", "market data", "dashboard", "insight"],
  furniture: ["chair", "chairs", "seat", "seating", "furniture", "desk chair"],
  debugging: ["debugger", "debugging", "debug", "bug", "bugs", "stack trace", "code review"],
};

const BUDGET_PATTERNS = [
  /\b(?:under|below|within|up to|max(?:imum)?(?: of)?|budget(?: of)?)\s+(?:XRP\s*)?(\d+(?:\.\d{1,6})?)\s*(?:XRP)?\b/i,
  /\b(?:less than|no more than)\s+(?:XRP\s*)?(\d+(?:\.\d{1,6})?)\s*(?:XRP)?\b/i,
] as const;

function inferCategory(objective: string): CatalogCategory | "unknown" {
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

  return best?.category ?? "unknown";
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
    (offer) => category !== "unknown" && offer.category === category,
  ).map((offer) => ({
    ...offer,
    features: [...offer.features],
    valueMetrics: [...offer.valueMetrics],
  }));

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
    valueMetrics: [...offer.valueMetrics],
  }));
}

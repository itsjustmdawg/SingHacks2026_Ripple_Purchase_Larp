export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  description: string;
  engine: string;
  capabilities: string[];
  step: string;
  initials: string;
}
export const brand = {
  name: "Purchase LARP",
  github: "https://github.com/itsjustmdawg/SingHacks2026_Ripple_Purchase_Larp",
};
export const agents: AgentProfile[] = [
  {
    id: "scout",
    name: "Market Scout",
    role: "Discovery agent",
    initials: "MS",
    engine: "Gemini",
    step: "01",
    description:
      "Tell it what you need. Scout turns your request into a shortlist of relevant products and services from the catalog.",
    capabilities: ["Natural language", "Catalog discovery", "Product matching"],
  },
  {
    id: "analyst",
    name: "Deal Analyst",
    role: "Comparison agent",
    initials: "DA",
    engine: "Gemini",
    step: "02",
    description:
      "Compares the shortlist against your objective and budget, then recommends a provider with a clear explanation.",
    capabilities: ["Quote comparison", "Budget filtering", "Recommendation"],
  },
  {
    id: "treasury",
    name: "Treasury",
    role: "Payment preparation",
    initials: "TR",
    engine: "Deterministic",
    step: "03",
    description:
      "Turns the selected catalog quote into an exact payment proposal. Amounts and destinations come from the catalog.",
    capabilities: ["Exact amounts", "Payment proposal", "Audit memo"],
  },
  {
    id: "policy",
    name: "Policy Engine",
    role: "Independent authorization",
    initials: "PE",
    engine: "Rules engine",
    step: "04",
    description:
      "Checks permissions, transaction limits, remaining budget and approval requirements before a payment can proceed.",
    capabilities: ["Spend limits", "Permissions", "Independent checks"],
  },
  {
    id: "xrpl",
    name: "XRPL Executor",
    role: "Settlement & verification",
    initials: "XR",
    engine: "XRPL Testnet",
    step: "05",
    description:
      "After your review, signs the payment locally and submits it to XRPL Testnet. The transaction hash is your on-chain receipt.",
    capabilities: [
      "Local signing",
      "Ledger validation",
      "Transaction receipts",
    ],
  },
];
export const categories = [
  "All",
  "storage",
  "api",
  "compute",
  "analytics",
  "furniture",
] as const;
export const categoryLabels: Record<string, string> = {
  All: "Everything",
  storage: "Cloud storage",
  api: "API credits",
  compute: "Compute",
  analytics: "Market data",
  furniture: "Office chairs",
};
export const sampleObjectives = [
  {
    label: "Cloud storage",
    text: "Find the best encrypted cloud storage under 5 XRP",
  },
  { label: "Office chair", text: "Find the best ergonomic chair under 5 XRP" },
  {
    label: "API credits",
    text: "Buy the most reliable API credits under 4.5 XRP",
  },
  { label: "Compute", text: "Find GPU compute for inference under 5 XRP" },
];

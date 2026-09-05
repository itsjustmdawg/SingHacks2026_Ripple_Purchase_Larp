import type { AgentTraceEvent, MultiAgentPipelineResult } from "./index";
export type SearchMode = "web" | "demo";
export interface PriceIntent {
  currency: string;
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
}
export interface PriceBudget extends PriceIntent {
  input: string;
  minXrp: number | null;
  maxXrp: number | null;
  xrpPerUnit: number;
  rateAsOf: string;
  rateSource: string;
}
export interface SearchPlan {
  item: string;
  mode: SearchMode;
  budget: PriceBudget;
  expiresAt: number;
}
export interface WebOffer {
  id: string;
  title: string;
  provider: string;
  amount: number;
  currency: string;
  priceXrp: number;
  sourceUrl: string;
  description: string;
  eligible: boolean;
}
export interface WebSearchResult {
  budget: PriceBudget;
  offers: WebOffer[];
  sources: { title: string; url: string }[];
  summary: string;
  suggestionsHtml: string;
  trace: AgentTraceEvent[];
  rateAsOf: string;
}
export interface ShoppingResult {
  budget: PriceBudget;
  demo?: MultiAgentPipelineResult;
  web?: WebSearchResult;
  fallbackReason?: string;
}

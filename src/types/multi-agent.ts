import type { CatalogOffer, CatalogSearchResult } from "./catalog";
import type { PaymentProposal } from "./agent";
import type { PolicyDecision } from "./policy";

export type PipelineAgent =
  | "market_scout"
  | "deal_analyst"
  | "treasury"
  | "policy_engine"
  | "xrpl_agent";

export type AgentTraceStatus =
  | "working"
  | "completed"
  | "approved"
  | "denied"
  | "confirmed"
  | "failed";

export type AgentExecutionEngine =
  | "pending"
  | "gemini"
  | "deterministic"
  | "policy"
  | "xrpl";

export interface AgentTraceEvent {
  id: string;
  agent: PipelineAgent;
  label: string;
  status: AgentTraceStatus;
  engine: AgentExecutionEngine;
  model?: string;
  message: string;
  timestamp: string;
}

export interface QuoteEvaluation {
  offerId: string;
  eligible: boolean;
  score: number | null;
  summary: string;
}

export interface DealAnalysis {
  selectedOffer: CatalogOffer | null;
  evaluations: QuoteEvaluation[];
}

export interface MultiAgentPipelineResult {
  pipelineId: string;
  objective: string;
  catalog: CatalogSearchResult;
  analysis: DealAnalysis;
  proposal: PaymentProposal | null;
  policyDecision: PolicyDecision | null;
  trace: AgentTraceEvent[];
  createdAt: string;
}

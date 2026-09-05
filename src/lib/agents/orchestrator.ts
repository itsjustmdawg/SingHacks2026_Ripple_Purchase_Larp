import {
  createPolicyContextFromEnvironment,
  evaluatePaymentPolicy,
} from "@/lib/policy";
import type {
  AgentRequest,
  AgentTraceEvent,
  MultiAgentPipelineResult,
  PolicyEvaluationContext,
} from "@/types";
import { validateAgentRequest } from "@/lib/agent";

import { runDealAnalystAgent } from "./deal-analyst-agent";
import {
  createConfiguredProcurementModel,
  type ProcurementAgentModel,
} from "./procurement-model";
import { runScoutAgent } from "./scout-agent";
import { runTreasuryAgent } from "./treasury-agent";

export interface MultiAgentPipelineOptions {
  priceRange?: { minXrp: number | null; maxXrp: number | null };
  now?: Date;
  policyContext?: PolicyEvaluationContext;
  model?: ProcurementAgentModel | null;
}

function stageTimestamp(now: Date, stage: number): string {
  return new Date(now.getTime() + stage).toISOString();
}

/**
 * Coordinates specialized agents without granting any of them signing power.
 * The transaction endpoint independently repeats policy authorization before
 * handing an approved request to the XRPL wallet layer.
 */
export async function runMultiAgentPipeline(
  input: AgentRequest,
  options: MultiAgentPipelineOptions = {},
): Promise<MultiAgentPipelineResult> {
  const request = validateAgentRequest(input);
  const now = options.now ?? new Date();
  const trace: AgentTraceEvent[] = [];
  const model =
    options.model === undefined
      ? createConfiguredProcurementModel()
      : options.model;

  const scout = await runScoutAgent(request, stageTimestamp(now, 0), model);
  if (options.priceRange) {
    scout.catalog = {
      ...scout.catalog,
      minBudgetXrp: options.priceRange.minXrp,
      budgetXrp: options.priceRange.maxXrp,
    };
  }
  trace.push(scout.trace);

  const analyst = await runDealAnalystAgent(
    request,
    scout.catalog,
    stageTimestamp(now, 1),
    model,
  );
  trace.push(analyst.trace);

  const selectedEvaluation = analyst.analysis.evaluations.find(
    (evaluation) => evaluation.offerId === analyst.analysis.selectedOffer?.id,
  );

  if (!analyst.analysis.selectedOffer || !selectedEvaluation) {
    return {
      pipelineId: `pipeline:${request.id}`,
      objective: request.userMessage,
      catalog: scout.catalog,
      analysis: analyst.analysis,
      proposal: null,
      policyDecision: null,
      trace,
      createdAt: now.toISOString(),
    };
  }

  const treasury = await runTreasuryAgent(
    request,
    analyst.analysis.selectedOffer,
    selectedEvaluation,
    now,
    stageTimestamp(now, 2),
  );
  trace.push(treasury.trace);

  const policyContext =
    options.policyContext ?? createPolicyContextFromEnvironment();
  const policyDecision = await evaluatePaymentPolicy(
    treasury.proposal,
    policyContext,
    { now },
  );
  trace.push({
    id: `${request.id}:policy`,
    agent: "policy_engine",
    label: "Policy Engine",
    status: policyDecision.approved ? "approved" : "denied",
    engine: "policy",
    message: policyDecision.reason,
    timestamp: stageTimestamp(now, 3),
  });

  return {
    pipelineId: `pipeline:${request.id}`,
    objective: request.userMessage,
    catalog: scout.catalog,
    analysis: analyst.analysis,
    proposal: treasury.proposal,
    policyDecision,
    trace,
    createdAt: now.toISOString(),
  };
}

import type { AgentRequest, PaymentAction } from "@/types";

export interface AgentModelDecision {
  action: PaymentAction;
  recipient: string | null;
  amount: number | null;
  reason: string;
  confidence: number;
}

/** A model may interpret intent, but it may never authorize or execute it. */
export interface AgentDecisionModel {
  interpret(request: AgentRequest): Promise<AgentModelDecision>;
}

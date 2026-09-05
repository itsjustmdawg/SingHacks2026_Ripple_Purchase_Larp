import { createPaymentProposal } from "@/lib/agent";
import type {
  AgentRequest,
  AgentTraceEvent,
  CatalogOffer,
  PaymentProposal,
  QuoteEvaluation,
} from "@/types";

export interface TreasuryAgentResult {
  proposal: PaymentProposal;
  trace: AgentTraceEvent;
}

export async function runTreasuryAgent(
  request: AgentRequest,
  selectedOffer: CatalogOffer,
  selectedEvaluation: QuoteEvaluation,
  now: Date,
  timestamp: string,
): Promise<TreasuryAgentResult> {
  const proposal = await createPaymentProposal(request, {
    now,
    model: {
      async interpret() {
        return {
          action: "payment",
          recipient: selectedOffer.recipient,
          amount: selectedOffer.priceXrp,
          reason: `Purchase ${selectedOffer.service} from ${selectedOffer.provider}. The Deal Analyst ranked it ${selectedEvaluation.score}/100 after comparing price, uptime, reliability, and response time.`,
          confidence: Math.min(0.99, Math.max(0.5, (selectedEvaluation.score ?? 50) / 100)),
        };
      },
    },
    fallbackOnModelError: false,
  });

  return {
    proposal,
    trace: {
      id: `${request.id}:treasury`,
      agent: "treasury",
      label: "Treasury",
      status: "completed",
      engine: "deterministic",
      message: `Constructed proposal ${proposal.id} to pay ${proposal.amount} XRP to ${selectedOffer.provider}; no funds have moved.`,
      timestamp,
    },
  };
}

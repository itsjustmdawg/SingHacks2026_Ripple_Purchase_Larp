import type { AgentRequest, PaymentProposal } from "@/types";
import { NotImplementedError } from "@/lib/utils";

/**
 * Converts a user objective into a structured proposal.
 *
 * The LLM-backed planner is intentionally absent from the initial scaffold.
 */
export async function createPaymentProposal(
  request: AgentRequest,
): Promise<PaymentProposal> {
  void request;
  throw new NotImplementedError(
    "Payment proposal generation is not implemented. Connect the agent service before using this endpoint.",
  );
}

import type {
  AgentRequest,
  PaymentAction,
  PaymentProposal,
} from "@/types";

import type { AgentDecisionModel, AgentModelDecision } from "./model";
import { validateAgentRequest } from "./validation";

const CLASSIC_ADDRESS_PATTERN = /\br[1-9A-HJ-NP-Za-km-z]{24,34}\b/;
const XRP_AMOUNT_PATTERNS = [
  /\bXRP\s*(\d+(?:\.\d+)?)\b/i,
  /\b(\d+(?:\.\d+)?)\s*XRP\b/i,
] as const;
const REQUEST_PAYMENT_PATTERN =
  /\b(request|collect|invoice)\b[\s\S]*\b(from|payment)\b/i;
const SEND_PAYMENT_PATTERN =
  /\b(pay|send|transfer|tip|purchase|buy)\b/i;

export interface AgentPlannerOptions {
  now?: Date;
  model?: AgentDecisionModel | null;
  fallbackOnModelError?: boolean;
}

interface ExtractedObjective extends AgentModelDecision {
  requestedAction: Exclude<PaymentAction, "none"> | null;
  purpose: string | null;
}

function extractAmount(message: string): number | null {
  for (const pattern of XRP_AMOUNT_PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      const fractionalDigits = match[1].split(".")[1]?.length ?? 0;
      if (fractionalDigits > 6) {
        return null;
      }

      const amount = Number(match[1]);
      if (Number.isFinite(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

function extractRequestedAction(
  message: string,
): Exclude<PaymentAction, "none"> | null {
  if (REQUEST_PAYMENT_PATTERN.test(message)) {
    return "request_payment";
  }

  return SEND_PAYMENT_PATTERN.test(message) ? "payment" : null;
}

function extractPurpose(message: string): string | null {
  const match = /\bfor\s+(.+)$/i.exec(message);
  if (!match) {
    return null;
  }

  const purpose = match[1].trim().replace(/[.!?]+$/, "");
  return purpose.length > 0 ? purpose.slice(0, 180) : null;
}

function extractObjective(message: string): ExtractedObjective {
  const requestedAction = extractRequestedAction(message);
  return {
    action: requestedAction ?? "none",
    requestedAction,
    recipient: CLASSIC_ADDRESS_PATTERN.exec(message)?.[0] ?? null,
    amount: extractAmount(message),
    purpose: extractPurpose(message),
    reason: "",
    confidence: requestedAction === null ? 0.25 : 0.95,
  };
}

function createReason(objective: ExtractedObjective): string {
  const { requestedAction, recipient, amount, purpose } = objective;

  if (objective.reason) {
    return objective.reason;
  }

  if (requestedAction !== null && recipient !== null && amount !== null) {
    const verb =
      requestedAction === "payment"
        ? "send an outbound payment"
        : "request a payment";
    const purposeText = purpose ? ` for ${purpose}` : "";
    return `The user asked to ${verb} of ${amount} XRP involving ${recipient}${purposeText}.`;
  }

  const missing: string[] = [];
  if (requestedAction === null) missing.push("a payment action");
  if (recipient === null) missing.push("an XRPL recipient");
  if (amount === null) missing.push("a positive XRP amount");

  return `No executable payment was proposed because the objective is missing ${missing.join(
    ", ",
  )}.`;
}

function toExtractedObjective(decision: AgentModelDecision): ExtractedObjective {
  return {
    ...decision,
    requestedAction: decision.action === "none" ? null : decision.action,
    purpose: null,
  };
}

async function interpretObjective(
  request: AgentRequest,
  options: AgentPlannerOptions,
): Promise<ExtractedObjective> {
  if (!options.model) {
    return extractObjective(request.userMessage);
  }

  try {
    return toExtractedObjective(await options.model.interpret(request));
  } catch (error) {
    if (options.fallbackOnModelError === false) {
      throw error;
    }

    return extractObjective(request.userMessage);
  }
}

function resolveCreatedAt(candidate: Date | undefined): string {
  if (candidate instanceof Date && Number.isFinite(candidate.getTime())) {
    return candidate.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Converts a constrained natural-language XRP objective into a proposal.
 * This deterministic baseline is deliberately transparent and replaceable by
 * an LLM-backed extractor; policy remains the independent authority either way.
 */
export async function createPaymentProposal(
  request: AgentRequest,
  options: AgentPlannerOptions = {},
): Promise<PaymentProposal> {
  const validatedRequest = validateAgentRequest(request);
  const objective = await interpretObjective(validatedRequest, options);
  const hasCompletePayment =
    objective.requestedAction !== null &&
    objective.recipient !== null &&
    objective.amount !== null;

  return {
    id: `proposal:${validatedRequest.id}`,
    action:
      hasCompletePayment && objective.requestedAction !== null
        ? objective.requestedAction
        : "none",
    recipient: objective.recipient ?? "",
    amount: objective.amount ?? 0,
    currency: "XRP",
    reason: createReason(objective),
    confidence: hasCompletePayment
      ? objective.confidence
      : Math.min(objective.confidence, 0.25),
    createdAt: resolveCreatedAt(options.now),
  };
}

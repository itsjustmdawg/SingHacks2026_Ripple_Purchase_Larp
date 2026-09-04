import OpenAI from "openai";

import type { AgentRequest, PaymentAction } from "@/types";

import type { AgentDecisionModel, AgentModelDecision } from "./model";

const DEFAULT_MODEL = "gpt-5.6-luna";
const PAYMENT_ACTIONS: readonly PaymentAction[] = [
  "payment",
  "request_payment",
  "none",
];
const CLASSIC_ADDRESS_PATTERN = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const DECISION_FIELDS = [
  "action",
  "recipient",
  "amount",
  "reason",
  "confidence",
] as const;
const DECISION_FIELD_SET = new Set<string>(DECISION_FIELDS);

const PAYMENT_DECISION_SCHEMA = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: PAYMENT_ACTIONS,
    },
    recipient: {
      type: ["string", "null"],
      description:
        "The exact XRPL Classic address from the objective, or null when absent.",
    },
    amount: {
      type: ["number", "null"],
      description: "The exact XRP amount from the objective, or null when absent.",
    },
    reason: {
      type: "string",
      minLength: 1,
      maxLength: 500,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  },
  required: DECISION_FIELDS,
  additionalProperties: false,
} as const;

const AGENT_INSTRUCTIONS = `You extract a proposed XRP payment action from a user objective.
Return payment only for an explicit outbound payment, request_payment only when the user asks to collect or request money, and none when the objective is incomplete or ambiguous.
Never invent an amount or recipient. Copy an XRPL Classic address and XRP amount exactly from the objective.
Give a concise reason describing the decision. You only propose; a separate policy engine authorizes and an XRPL service executes.`;

type UnknownRecord = Record<string, unknown>;

export class AgentModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentModelOutputError";
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

export function validateAgentModelDecision(value: unknown): AgentModelDecision {
  const record = asRecord(value);
  if (record === null) {
    throw new AgentModelOutputError("Model decision must be a JSON object.");
  }

  const keys = Object.keys(record);
  if (
    keys.length !== DECISION_FIELDS.length ||
    keys.some((key) => !DECISION_FIELD_SET.has(key))
  ) {
    throw new AgentModelOutputError(
      "Model decision contains missing or unexpected fields.",
    );
  }

  if (
    typeof record.action !== "string" ||
    !PAYMENT_ACTIONS.includes(record.action as PaymentAction)
  ) {
    throw new AgentModelOutputError("Model decision has an invalid action.");
  }

  if (
    record.recipient !== null &&
    (typeof record.recipient !== "string" ||
      !CLASSIC_ADDRESS_PATTERN.test(record.recipient))
  ) {
    throw new AgentModelOutputError(
      "Model decision recipient is not a Classic-address-shaped value.",
    );
  }

  if (
    record.amount !== null &&
    (typeof record.amount !== "number" ||
      !Number.isFinite(record.amount) ||
      record.amount <= 0)
  ) {
    throw new AgentModelOutputError(
      "Model decision amount must be a positive finite number or null.",
    );
  }

  if (
    typeof record.reason !== "string" ||
    record.reason.trim().length === 0 ||
    record.reason.length > 500
  ) {
    throw new AgentModelOutputError(
      "Model decision reason must contain 1 to 500 characters.",
    );
  }

  if (
    typeof record.confidence !== "number" ||
    !Number.isFinite(record.confidence) ||
    record.confidence < 0 ||
    record.confidence > 1
  ) {
    throw new AgentModelOutputError(
      "Model decision confidence must be between 0 and 1.",
    );
  }

  const action = record.action as PaymentAction;
  if (
    action !== "none" &&
    (record.recipient === null || record.amount === null)
  ) {
    throw new AgentModelOutputError(
      "Executable model decisions require both recipient and amount.",
    );
  }

  return {
    action,
    recipient: record.recipient as string | null,
    amount: record.amount as number | null,
    reason: record.reason.trim(),
    confidence: record.confidence,
  };
}

export interface OpenAIAgentModelOptions {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class OpenAIAgentModel implements AgentDecisionModel {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIAgentModelOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model?.trim() || DEFAULT_MODEL;
  }

  async interpret(request: AgentRequest): Promise<AgentModelDecision> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: AGENT_INSTRUCTIONS,
      input: request.userMessage,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "xrpl_payment_decision",
          strict: true,
          schema: PAYMENT_DECISION_SCHEMA,
        },
      },
    });

    if (!response.output_text) {
      throw new AgentModelOutputError("Model returned no structured output.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.output_text);
    } catch {
      throw new AgentModelOutputError("Model returned invalid JSON.");
    }

    return validateAgentModelDecision(parsed);
  }
}

export function createConfiguredAgentModel(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AgentDecisionModel | null {
  const apiKey = environment.LLM_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return new OpenAIAgentModel({
    apiKey,
    model: environment.LLM_MODEL,
    baseURL: environment.LLM_BASE_URL,
  });
}

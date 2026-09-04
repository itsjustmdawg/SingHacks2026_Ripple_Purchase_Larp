import type { AgentRequest } from "@/types";

const AGENT_REQUEST_FIELDS = ["id", "userMessage", "timestamp"] as const;
const AGENT_REQUEST_FIELD_SET = new Set<string>(AGENT_REQUEST_FIELDS);
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const MAX_USER_MESSAGE_LENGTH = 2_000;

type UnknownRecord = Record<string, unknown>;

export class AgentRequestValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid agent request: ${issues.join("; ")}.`);
    this.name = "AgentRequestValidationError";
    this.issues = [...issues];
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

/** Validates model input at runtime instead of trusting a TypeScript cast. */
export function validateAgentRequest(value: unknown): AgentRequest {
  const record = asRecord(value);
  if (record === null) {
    throw new AgentRequestValidationError(["request must be a JSON object"]);
  }

  const issues: string[] = [];
  const unknownFields = Object.keys(record).filter(
    (field) => !AGENT_REQUEST_FIELD_SET.has(field),
  );
  if (unknownFields.length > 0) {
    issues.push("unknown fields are not allowed");
  }

  const missingFields = AGENT_REQUEST_FIELDS.filter(
    (field) => !Object.prototype.hasOwnProperty.call(record, field),
  );
  if (missingFields.length > 0) {
    issues.push("id, userMessage, and timestamp are required");
  }

  if (
    typeof record.id !== "string" ||
    !SAFE_REQUEST_ID_PATTERN.test(record.id)
  ) {
    issues.push(
      "id must be a safe non-empty identifier of at most 100 characters",
    );
  }

  if (
    typeof record.userMessage !== "string" ||
    record.userMessage.trim().length === 0 ||
    record.userMessage.length > MAX_USER_MESSAGE_LENGTH
  ) {
    issues.push(
      `userMessage must contain 1 to ${MAX_USER_MESSAGE_LENGTH} characters`,
    );
  }

  if (!isCanonicalIsoTimestamp(record.timestamp)) {
    issues.push("timestamp must be a canonical ISO-8601 timestamp");
  }

  if (issues.length > 0) {
    throw new AgentRequestValidationError(issues);
  }

  return {
    id: record.id as string,
    userMessage: (record.userMessage as string).trim(),
    timestamp: record.timestamp as string,
  };
}

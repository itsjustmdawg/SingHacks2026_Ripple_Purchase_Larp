export interface AgentAuditMemoData {
  proposalId: string;
  agent?: string;
  reason?: string;
  timestamp?: string;
  action?: string;
}

export interface XrplMemoEntry {
  Memo: {
    MemoType?: string;
    MemoFormat?: string;
    MemoData?: string;
  };
}

const MEMO_TYPE_AUDIT = "agent/payment-audit";
const MEMO_FORMAT_JSON = "application/json";

/**
 * Encodes an ASCII or UTF-8 string into uppercase hex.
 */
export function stringToHex(text: string): string {
  return Buffer.from(text, "utf8").toString("hex").toUpperCase();
}

/**
 * Decodes a hex string back into UTF-8.
 */
export function hexToString(hex: string): string {
  return Buffer.from(hex, "hex").toString("utf8");
}

/**
 * Constructs a structured on-chain audit Memo linking the AI agent's proposal
 * and rationale to the XRPL transaction.
 */
export function buildAuditMemo(data: AgentAuditMemoData): XrplMemoEntry {
  const payload: AgentAuditMemoData = {
    proposalId: data.proposalId,
    agent: data.agent || "autonomous-payment-agent",
    reason: data.reason || "Autonomous purchase proposal",
    timestamp: data.timestamp || new Date().toISOString(),
    action: data.action || "payment",
  };

  return {
    Memo: {
      MemoType: stringToHex(MEMO_TYPE_AUDIT),
      MemoFormat: stringToHex(MEMO_FORMAT_JSON),
      MemoData: stringToHex(JSON.stringify(payload)),
    },
  };
}

/**
 * Decodes an agent audit memo from an XRPL transaction's Memos array.
 * Returns null if no valid audit memo is present.
 */
export function decodeAuditMemo(memos?: unknown): AgentAuditMemoData | null {
  if (!Array.isArray(memos)) {
    return null;
  }

  const targetTypeHex = stringToHex(MEMO_TYPE_AUDIT);

  for (const entry of memos) {
    if (!entry || typeof entry !== "object" || !("Memo" in entry)) {
      continue;
    }

    const memo = (entry as XrplMemoEntry).Memo;
    if (!memo || typeof memo !== "object") {
      continue;
    }

    if (memo.MemoType && memo.MemoType.toUpperCase() === targetTypeHex) {
      if (!memo.MemoData) {
        continue;
      }
      try {
        const jsonString = hexToString(memo.MemoData);
        return JSON.parse(jsonString) as AgentAuditMemoData;
      } catch {
        return null;
      }
    }
  }

  // Fallback: Check if any memo data can be parsed as JSON containing proposalId
  for (const entry of memos) {
    const memo = (entry as XrplMemoEntry)?.Memo;
    if (memo?.MemoData) {
      try {
        const jsonString = hexToString(memo.MemoData);
        const parsed = JSON.parse(jsonString);
        if (parsed && typeof parsed === "object" && "proposalId" in parsed) {
          return parsed as AgentAuditMemoData;
        }
      } catch {
        // Continue searching
      }
    }
  }

  return null;
}

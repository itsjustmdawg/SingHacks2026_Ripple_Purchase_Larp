import { describe, expect, it } from "vitest";
import {
  buildAuditMemo,
  decodeAuditMemo,
  stringToHex,
  hexToString,
} from "./memo";

describe("XRPL Audit Memos", () => {
  it("converts string to hex and back accurately", () => {
    const text = "SingHacks-XRPL-Payment-2026";
    const hex = stringToHex(text);
    expect(hex).toMatch(/^[0-9A-F]+$/);
    expect(hexToString(hex)).toBe(text);
  });

  it("builds a correctly structured on-chain audit memo", () => {
    const memo = buildAuditMemo({
      proposalId: "prop-12345",
      reason: "Purchased premium API subscription",
      agent: "purchasing-agent-v1",
      action: "payment",
    });

    expect(memo.Memo).toBeDefined();
    expect(memo.Memo.MemoType).toBe(stringToHex("agent/payment-audit"));
    expect(memo.Memo.MemoFormat).toBe(stringToHex("application/json"));
    expect(memo.Memo.MemoData).toBeDefined();

    const decodedPayload = JSON.parse(hexToString(memo.Memo.MemoData!));
    expect(decodedPayload.proposalId).toBe("prop-12345");
    expect(decodedPayload.reason).toBe("Purchased premium API subscription");
    expect(decodedPayload.agent).toBe("purchasing-agent-v1");
    expect(decodedPayload.timestamp).toBeDefined();
  });

  it("decodes an audit memo from an array of memos", () => {
    const auditMemo = buildAuditMemo({
      proposalId: "prop-999",
      reason: "Automated catalog purchase",
    });

    const otherMemo = {
      Memo: {
        MemoData: stringToHex("some unrelated memo"),
      },
    };

    const decoded = decodeAuditMemo([otherMemo, auditMemo]);
    expect(decoded).not.toBeNull();
    expect(decoded?.proposalId).toBe("prop-999");
    expect(decoded?.reason).toBe("Automated catalog purchase");
  });

  it("returns null when no valid audit memo is present", () => {
    expect(decodeAuditMemo(undefined)).toBeNull();
    expect(decodeAuditMemo([])).toBeNull();
    expect(decodeAuditMemo([{ Memo: { MemoData: "not json" } }])).toBeNull();
  });
});

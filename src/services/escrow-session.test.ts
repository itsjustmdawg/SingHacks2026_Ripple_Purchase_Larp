import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  saveEscrowSession,
  getEscrowSession,
  clearEscrowSession,
  type EscrowSession,
} from "./escrow-session";
const saved = {
  pipeline: { proposal: { id: "p1" } },
  objective: "Chair",
  pricing: "5 XRP",
  escrow: { escrowSequence: 10 },
  delivery: null,
} as EscrowSession;
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("escrow reload recovery", () => {
  it("preserves the original proposal and escrow sequence", () => {
    expect(saveEscrowSession(saved)).toBe(true);
    expect(getEscrowSession()).toEqual(saved);
  });
  it("clears a settled escrow", () => {
    saveEscrowSession(saved);
    clearEscrowSession();
    expect(getEscrowSession()).toBeNull();
  });
  it("fails safely when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw Error("denied");
      },
      getItem: () => {
        throw Error("denied");
      },
    });
    expect(saveEscrowSession(saved)).toBe(false);
    expect(getEscrowSession()).toBeNull();
  });
});

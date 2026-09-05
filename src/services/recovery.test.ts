import { describe, it, expect } from "vitest";
import { paymentRecovery } from "./recovery";
import type { Receipt } from "./purchase";
describe("safe retry routing", () => {
  it("never resends an uncertain payment", () =>
    expect(paymentRecovery(null, true)).toBe("verify"));
  it("checks hashed failures before another payment", () =>
    expect(
      paymentRecovery({ status: "failed", hash: "HASH" } as Receipt, false),
    ).toBe("verify"));
  it("permits fresh review after a no-hash preflight failure", () =>
    expect(
      paymentRecovery({ status: "failed", hash: null } as Receipt, false),
    ).toBe("review"));
  it("never offers payment retry for a confirmed receipt", () =>
    expect(
      paymentRecovery({ status: "confirmed", hash: "HASH" } as Receipt, false),
    ).toBe("none"));
});

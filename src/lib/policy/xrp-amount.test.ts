import { describe, expect, it } from "vitest";

import {
  MAX_XRP_DROPS,
  XRP_DROPS_PER_XRP,
  xrpToDrops,
} from "./xrp-amount";

describe("xrpToDrops", () => {
  it("exports the XRPL denomination and maximum", () => {
    expect(XRP_DROPS_PER_XRP).toBe(BigInt("1000000"));
    expect(MAX_XRP_DROPS).toBe(BigInt("100000000000000000"));
  });

  it.each([
    [0, "0"],
    [1, "1000000"],
    [0.000001, "1"],
    [1.000001, "1000001"],
    [12.345678, "12345678"],
    [1.23e2, "123000000"],
    [100_000_000_000, "100000000000000000"],
  ])("converts %s XRP exactly", (xrp, expectedDrops) => {
    expect(xrpToDrops(xrp)).toBe(BigInt(expectedDrops));
  });

  it.each([
    -1,
    -0.000001,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects invalid numeric value %s", (value) => {
    expect(xrpToDrops(value)).toBeNull();
  });

  it.each([0.0000001, 1.0000001, 0.1 + 0.2])(
    "rejects fractional-drop precision in %s",
    (value) => {
      expect(xrpToDrops(value)).toBeNull();
    },
  );

  it("rejects an amount above the maximum", () => {
    expect(xrpToDrops(100_000_000_001)).toBeNull();
  });

  it.each([undefined, null, "1", BigInt(1), {}, [], true, Symbol("1")])(
    "rejects non-number input without throwing",
    (value) => {
      expect(() => xrpToDrops(value)).not.toThrow();
      expect(xrpToDrops(value)).toBeNull();
    },
  );

  it("does not coerce hostile objects", () => {
    const value = {
      valueOf(): never {
        throw new Error("must not be called");
      },
      toString(): never {
        throw new Error("must not be called");
      },
    };

    expect(() => xrpToDrops(value)).not.toThrow();
    expect(xrpToDrops(value)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { isValidClassicAddress } from "./xrpl-address";

describe("isValidClassicAddress", () => {
  it("accepts the XRPL genesis account Classic address", () => {
    expect(
      isValidClassicAddress("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"),
    ).toBe(true);
  });

  it("rejects an address with an altered checksum", () => {
    expect(
      isValidClassicAddress("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTp"),
    ).toBe(false);
  });

  it.each(["", "   ", null, undefined, 123, {}, Symbol("address")])(
    "rejects a blank or non-string value (%p)",
    (value) => {
      expect(isValidClassicAddress(value)).toBe(false);
    },
  );

  it("rejects characters outside the Ripple Base58 alphabet", () => {
    expect(
      isValidClassicAddress("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyT0"),
    ).toBe(false);
  });

  it("rejects an X-address", () => {
    expect(
      isValidClassicAddress(
        "XVLhHMPHU98es4dbozjVtdWzVrDjtVJiPv3QB5xD8WirM8A",
      ),
    ).toBe(false);
  });
});

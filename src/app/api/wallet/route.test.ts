import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "./route";
import * as xrplModule from "@/lib/xrpl";

describe("GET /api/wallet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns wallet info successfully", async () => {
    const mockWalletInfo: xrplModule.WalletInfo = {
      address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      balanceXrp: 1000,
      spendableXrp: 998.9,
      reservedXrp: 1.1,
      ownerCount: 1,
      isFunded: true,
    };

    vi.spyOn(xrplModule, "getWalletInfo").mockResolvedValue(mockWalletInfo);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.address).toBe("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
    expect(data.spendableXrp).toBe(998.9);
  });

  it("returns 500 when getWalletInfo throws", async () => {
    vi.spyOn(xrplModule, "getWalletInfo").mockRejectedValue(new Error("RPC node unreachable"));

    const response = await GET();
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("RPC node unreachable");
  });
});

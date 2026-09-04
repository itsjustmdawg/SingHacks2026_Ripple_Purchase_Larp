import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { Wallet } from "xrpl";
import {
  loadWalletFromEnv,
  getActiveWallet,
  setActiveWallet,
  getWalletInfo,
} from "./wallet";
import * as clientModule from "./client";

describe("XRPL Wallet Service", () => {
  const originalEnv = process.env;
  let testWallet: Wallet;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    setActiveWallet(null);
    testWallet = Wallet.generate();
  });

  afterEach(() => {
    process.env = originalEnv;
    setActiveWallet(null);
    vi.restoreAllMocks();
  });

  it("returns null when XRPL_WALLET_SEED is empty or undefined", () => {
    delete process.env.XRPL_WALLET_SEED;
    expect(loadWalletFromEnv()).toBeNull();

    process.env.XRPL_WALLET_SEED = "   ";
    expect(loadWalletFromEnv()).toBeNull();
  });

  it("loads a valid wallet from XRPL_WALLET_SEED without throwing", () => {
    process.env.XRPL_WALLET_SEED = testWallet.seed!;
    const wallet = loadWalletFromEnv();
    expect(wallet).not.toBeNull();
    expect(wallet?.classicAddress).toBe(testWallet.classicAddress);
  });

  it("returns env wallet when available for getActiveWallet()", async () => {
    process.env.XRPL_WALLET_SEED = testWallet.seed!;
    const wallet = await getActiveWallet();
    expect(wallet.seed).toBe(testWallet.seed);
  });

  it("allows setting and overriding active wallet in memory", async () => {
    const testWallet = Wallet.generate();
    setActiveWallet(testWallet);
    const active = await getActiveWallet();
    expect(active.classicAddress).toBe(testWallet.classicAddress);
  });

  it("calculates spendable balance and locked reserves correctly from ledger data", async () => {
    const mockAddress = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
    // Mock client request
    const mockRequest = vi.fn().mockResolvedValue({
      result: {
        account_data: {
          Account: mockAddress,
          Balance: "100000000", // 100 XRP
          OwnerCount: 2, // 2 objects = 0.4 XRP reserve + 1.0 XRP base = 1.4 XRP
        },
      },
    });

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue({
      request: mockRequest,
    } as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>);

    const info = await getWalletInfo(mockAddress);
    expect(info.address).toBe(mockAddress);
    expect(info.isFunded).toBe(true);
    expect(info.balanceXrp).toBe(100);
    expect(info.reservedXrp).toBe(1.4);
    expect(info.spendableXrp).toBe(98.6);
    expect(info.ownerCount).toBe(2);
  });

  it("handles actNotFound ledger error by returning unfunded status with zero balances", async () => {
    const mockAddress = "rUnfundedAccount123456789ABCDEF";
    const notFoundError = new Error("Account not found.");
    (notFoundError as unknown as { data: { error: string } }).data = {
      error: "actNotFound",
    };

    vi.spyOn(clientModule, "getXrplClient").mockResolvedValue({
      request: vi.fn().mockRejectedValue(notFoundError),
    } as unknown as Awaited<ReturnType<typeof clientModule.getXrplClient>>);

    const info = await getWalletInfo(mockAddress);
    expect(info.address).toBe(mockAddress);
    expect(info.isFunded).toBe(false);
    expect(info.balanceXrp).toBe(0);
    expect(info.spendableXrp).toBe(0);
    expect(info.reservedXrp).toBe(0);
  });
});

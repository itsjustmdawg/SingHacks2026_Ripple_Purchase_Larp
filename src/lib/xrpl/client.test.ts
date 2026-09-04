import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getXrplConfig,
  XRPL_AI_STARTER_KIT_SOURCE_TAG,
  XRPL_NETWORKS,
  XRPL_RESERVES,
} from "@/config/xrpl";
import { getXrplClient, disconnectXrplClient } from "./client";

describe("XRPL Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to testnet configuration when no env vars are set", () => {
    delete process.env.XRPL_NETWORK;
    delete process.env.XRPL_RPC_URL;

    const config = getXrplConfig();
    expect(config.network).toBe("testnet");
    expect(config.endpoint).toBe(XRPL_NETWORKS.testnet.websocket);
    expect(config.explorerTxBaseUrl).toBe("https://testnet.xrpl.org/transactions/");
  });

  it("respects XRPL_NETWORK environment variable", () => {
    process.env.XRPL_NETWORK = "mainnet";
    delete process.env.XRPL_RPC_URL;

    const config = getXrplConfig();
    expect(config.network).toBe("mainnet");
    expect(config.endpoint).toBe(XRPL_NETWORKS.mainnet.websocket);
    expect(config.explorerTxBaseUrl).toBe("https://livenet.xrpl.org/transactions/");
  });

  it("respects custom XRPL_RPC_URL override", () => {
    process.env.XRPL_RPC_URL = "wss://custom-node.example.com:51233";

    const config = getXrplConfig();
    expect(config.endpoint).toBe("wss://custom-node.example.com:51233");
  });

  it("defines standard AI Starter Kit SourceTag", () => {
    expect(XRPL_AI_STARTER_KIT_SOURCE_TAG).toBe(20260530);
  });

  it("defines correct base and owner reserves", () => {
    expect(XRPL_RESERVES.BASE_RESERVE_DROPS).toBe(BigInt("1000000"));
    expect(XRPL_RESERVES.OWNER_RESERVE_DROPS).toBe(BigInt("200000"));
  });
});

describe("XRPL Client Manager", () => {
  afterEach(async () => {
    await disconnectXrplClient();
  });

  it("creates a client instance for the configured endpoint", async () => {
    // Test that client instantiates with target URL without throwing
    const client = await getXrplClient("wss://s.altnet.rippletest.net:51233");
    expect(client).toBeDefined();
    expect(client.url).toBe("wss://s.altnet.rippletest.net:51233");
    await disconnectXrplClient();
  });
});

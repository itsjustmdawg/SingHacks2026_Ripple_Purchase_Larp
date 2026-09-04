export type XrplNetwork = "testnet" | "mainnet" | "devnet";

export interface XrplNetworkEndpoints {
  websocket: string;
  rpc: string;
  explorerTxBaseUrl: string;
}

export const XRPL_NETWORKS: Record<XrplNetwork, XrplNetworkEndpoints> = {
  testnet: {
    websocket: "wss://s.altnet.rippletest.net:51233",
    rpc: "https://s.altnet.rippletest.net:51234",
    explorerTxBaseUrl: "https://testnet.xrpl.org/transactions/",
  },
  mainnet: {
    websocket: "wss://xrplcluster.com",
    rpc: "https://xrplcluster.com",
    explorerTxBaseUrl: "https://livenet.xrpl.org/transactions/",
  },
  devnet: {
    websocket: "wss://s.devnet.rippletest.net:51233",
    rpc: "https://s.devnet.rippletest.net:51234",
    explorerTxBaseUrl: "https://devnet.xrpl.org/transactions/",
  },
} as const;

/**
 * Default SourceTag for XRPL AI Starter Kit agentic transactions.
 * Enables on-chain attribution and tracking for AI-driven transactions.
 */
export const XRPL_AI_STARTER_KIT_SOURCE_TAG = 20260530;

/**
 * Standard ledger reserves in drops (1 XRP = 1,000,000 drops).
 * An account must maintain the base reserve plus owner reserves for each held object.
 */
export const XRPL_RESERVES = {
  BASE_RESERVE_XRP: 1,
  BASE_RESERVE_DROPS: BigInt("1000000"),
  OWNER_RESERVE_XRP: 0.2,
  OWNER_RESERVE_DROPS: BigInt("200000"),
} as const;

export interface ResolvedXrplConfig {
  network: XrplNetwork;
  endpoint: string;
  explorerTxBaseUrl: string;
}

/**
 * Resolves current XRPL network configuration from environment variables.
 * Defaults safely to Testnet.
 */
export function getXrplConfig(): ResolvedXrplConfig {
  const envNetwork = (process.env.XRPL_NETWORK || "testnet").toLowerCase() as XrplNetwork;
  const network: XrplNetwork = XRPL_NETWORKS[envNetwork] ? envNetwork : "testnet";
  const endpoints = XRPL_NETWORKS[network];
  const endpoint = process.env.XRPL_RPC_URL?.trim() || endpoints.websocket;

  return {
    network,
    endpoint,
    explorerTxBaseUrl: endpoints.explorerTxBaseUrl,
  };
}

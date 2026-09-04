export interface XrplClientConfig {
  network: "testnet" | "mainnet";
  rpcUrl: string;
}

/**
 * Describes the future XRPL client boundary without opening a connection.
 */
export interface XrplClientService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

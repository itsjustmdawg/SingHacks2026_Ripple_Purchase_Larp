import { Client } from "xrpl";
import { getXrplConfig, type XrplNetwork } from "@/config/xrpl";

export interface XrplClientConfig {
  network: XrplNetwork;
  endpoint: string;
}

export interface XrplClientService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getClient(): Client;
  isConnected(): boolean;
}

let sharedClient: Client | null = null;
let connectionPromise: Promise<Client> | null = null;

/**
 * Retrieves an active, connected XRPL Client singleton.
 * Automatically connects or reconnects if the socket was dropped.
 */
export async function getXrplClient(customEndpoint?: string): Promise<Client> {
  const config = getXrplConfig();
  const endpoint = customEndpoint?.trim() || config.endpoint;

  // If client exists but for a different endpoint, disconnect and reset
  if (sharedClient && sharedClient.url !== endpoint) {
    try {
      if (sharedClient.isConnected()) {
        await sharedClient.disconnect();
      }
    } catch {
      // Ignore disconnect errors on old client
    }
    sharedClient = null;
    connectionPromise = null;
  }

  if (sharedClient && sharedClient.isConnected()) {
    return sharedClient;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const client = new Client(endpoint);
      await client.connect();
      sharedClient = client;
      return client;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Disconnects the shared XRPL client connection if active.
 */
export async function disconnectXrplClient(): Promise<void> {
  if (sharedClient) {
    try {
      if (sharedClient.isConnected()) {
        await sharedClient.disconnect();
      }
    } finally {
      sharedClient = null;
      connectionPromise = null;
    }
  }
}

/**
 * Helper client service object implementing the interface.
 */
export const xrplService: XrplClientService = {
  async connect(): Promise<void> {
    await getXrplClient();
  },
  async disconnect(): Promise<void> {
    await disconnectXrplClient();
  },
  getClient(): Client {
    if (!sharedClient || !sharedClient.isConnected()) {
      throw new Error("XRPL client is not connected. Call getXrplClient() first.");
    }
    return sharedClient;
  },
  isConnected(): boolean {
    return sharedClient !== null && sharedClient.isConnected();
  },
};

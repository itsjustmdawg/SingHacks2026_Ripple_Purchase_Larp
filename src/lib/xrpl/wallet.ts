import { Wallet, dropsToXrp } from "xrpl";
import { getXrplClient } from "./client";
import { XRPL_RESERVES } from "@/config/xrpl";

export interface WalletInfo {
  address: string;
  balanceXrp: number;
  spendableXrp: number;
  reservedXrp: number;
  ownerCount: number;
  isFunded: boolean;
}

let cachedDevWallet: Wallet | null = null;

/**
 * Loads the agent wallet from the XRPL_WALLET_SEED environment variable.
 * Returns null if no seed is configured.
 */
export function loadWalletFromEnv(): Wallet | null {
  const seed = process.env.XRPL_WALLET_SEED?.trim();
  if (!seed) {
    return null;
  }
  return Wallet.fromSeed(seed);
}

/**
 * Retrieves the active agent wallet.
 * If XRPL_WALLET_SEED is set, loads that wallet.
 * Otherwise, on Testnet/Devnet, generates and funds a testnet wallet via the faucet,
 * caching it for the active server lifecycle.
 */
export async function getActiveWallet(): Promise<Wallet> {
  const envWallet = loadWalletFromEnv();
  if (envWallet) {
    return envWallet;
  }

  if (cachedDevWallet) {
    return cachedDevWallet;
  }

  const client = await getXrplClient();
  const { wallet } = await client.fundWallet();
  cachedDevWallet = wallet;
  return cachedDevWallet;
}

/**
 * Explicitly sets or overrides the active in-memory wallet (useful for testing or custom runtime injection).
 */
export function setActiveWallet(wallet: Wallet | null): void {
  cachedDevWallet = wallet;
}

/**
 * Fetches public account information, spendable balance, and reserve figures
 * for a given address or the active agent wallet.
 *
 * NEVER exposes private seeds or keys.
 */
export async function getWalletInfo(targetAddress?: string): Promise<WalletInfo> {
  const client = await getXrplClient();
  let address = targetAddress?.trim();

  if (!address) {
    const activeWallet = await getActiveWallet();
    address = activeWallet.classicAddress;
  }

  try {
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });

    const accountData = response.result.account_data;
    const totalDrops = BigInt(accountData.Balance);
    const ownerCount = accountData.OwnerCount ?? 0;

    const lockedDrops =
      XRPL_RESERVES.BASE_RESERVE_DROPS +
      BigInt(ownerCount) * XRPL_RESERVES.OWNER_RESERVE_DROPS;

    const spendableDrops =
      totalDrops > lockedDrops ? totalDrops - lockedDrops : BigInt(0);

    return {
      address,
      balanceXrp: Number(dropsToXrp(totalDrops.toString())),
      spendableXrp: Number(dropsToXrp(spendableDrops.toString())),
      reservedXrp: Number(dropsToXrp(lockedDrops.toString())),
      ownerCount,
      isFunded: true,
    };
  } catch (error: unknown) {
    // Handle unfunded/new accounts on ledger gracefully
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "data" in error
          ? JSON.stringify((error as { data: unknown }).data)
          : String(error);

    if (errorMessage.includes("actNotFound") || errorMessage.includes("Account not found")) {
      return {
        address,
        balanceXrp: 0,
        spendableXrp: 0,
        reservedXrp: 0,
        ownerCount: 0,
        isFunded: false,
      };
    }

    throw error;
  }
}

import type { TransactionResult } from "@/types";
import { NotImplementedError } from "@/lib/utils";

/**
 * Verifies a submitted transaction against a validated ledger.
 */
export async function verifyTransaction(
  hash: string,
): Promise<TransactionResult> {
  void hash;
  throw new NotImplementedError(
    "XRPL transaction verification is not implemented. No ledger lookup was performed.",
  );
}

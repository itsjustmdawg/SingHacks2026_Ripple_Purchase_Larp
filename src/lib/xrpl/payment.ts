import type { TransactionRequest, TransactionResult } from "@/types";
import { NotImplementedError } from "@/lib/utils";

/**
 * Submits a policy-approved request to XRPL.
 * Signing and submission are intentionally not implemented in this scaffold.
 */
export async function submitPayment(
  request: TransactionRequest,
): Promise<TransactionResult> {
  void request;
  throw new NotImplementedError(
    "XRPL payment submission is not implemented. No transaction was signed or submitted.",
  );
}

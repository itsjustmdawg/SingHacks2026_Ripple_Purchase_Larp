import type { MultiAgentPipelineResult } from "@/types";
import type {
  EscrowTransactionResult,
  VendorDeliveryReceipt,
} from "./purchase";
export interface EscrowSession {
  pipeline: MultiAgentPipelineResult;
  objective: string;
  pricing: string;
  escrow: EscrowTransactionResult | null;
  delivery: VendorDeliveryReceipt | null;
}
const KEY = "purchase-larp-escrow-session-v1";
export function saveEscrowSession(value: EscrowSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function clearEscrowSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
export function getEscrowSession(): EscrowSession | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v?.pipeline?.proposal &&
      typeof v.objective === "string" &&
      typeof v.pricing === "string"
      ? v
      : null;
  } catch {
    return null;
  }
}

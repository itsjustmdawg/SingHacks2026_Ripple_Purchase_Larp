import type { Receipt } from "./purchase";
export function paymentRecovery(
  receipt: Receipt | null,
  uncertain: boolean,
): "verify" | "review" | "none" {
  if (receipt?.status === "confirmed") return "none";
  if (uncertain || receipt?.hash) return "verify";
  return receipt?.status === "failed" ? "review" : "none";
}

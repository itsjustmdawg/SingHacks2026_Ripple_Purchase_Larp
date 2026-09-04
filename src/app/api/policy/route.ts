import { NextResponse } from "next/server";

import { evaluatePaymentPolicy } from "@/lib/policy";
import type { PaymentProposal } from "@/types";

export async function POST(request: Request) {
  let proposal: PaymentProposal;

  try {
    proposal = (await request.json()) as PaymentProposal;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const decision = await evaluatePaymentPolicy(proposal);
  return NextResponse.json(decision);
}

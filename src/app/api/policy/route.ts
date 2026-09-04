import { NextResponse } from "next/server";

import {
  createDevelopmentPolicyContext,
  evaluatePaymentPolicy,
} from "@/lib/policy";

export async function POST(request: Request) {
  let proposal: unknown;

  try {
    proposal = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // This scaffold has no authentication/budget store yet. Keep development
  // authorization facts server-owned; production must resolve real trusted
  // context here rather than accepting it from the request body.
  const decision = await evaluatePaymentPolicy(
    proposal,
    createDevelopmentPolicyContext(),
  );
  return NextResponse.json(decision);
}

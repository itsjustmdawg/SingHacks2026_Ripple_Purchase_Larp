import { NextResponse } from "next/server";

import {
  createPolicyContextFromEnvironment,
  evaluatePaymentPolicy,
  PolicyConfigurationError,
} from "@/lib/policy";
import type { PolicyEvaluationContext } from "@/types";

export async function POST(request: Request) {
  let proposal: unknown;

  try {
    proposal = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let context: PolicyEvaluationContext;
  try {
    context = createPolicyContextFromEnvironment();
  } catch (error) {
    if (error instanceof PolicyConfigurationError) {
      return NextResponse.json(
        { error: "Policy configuration is invalid.", issues: error.issues },
        { status: 503 },
      );
    }
    throw error;
  }

  // Context is resolved from server-owned configuration. Never accept budget,
  // permission, or approval facts from the request body/model.
  const decision = await evaluatePaymentPolicy(proposal, context);
  return NextResponse.json(decision);
}

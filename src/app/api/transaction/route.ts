import { NextResponse } from "next/server";
import {
  authorizePaymentProposal,
  createPolicyContextFromEnvironment,
  PolicyConfigurationError,
} from "@/lib/policy";
import { submitPayment, verifyTransaction } from "@/lib/xrpl";

export async function POST(request: Request) {
  let proposal: unknown;

  try {
    proposal = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let context;
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

  // Re-authorize the exact client/model-authored proposal at the execution
  // boundary. Never accept an approval flag or TransactionRequest from a caller.
  const authorization = await authorizePaymentProposal(proposal, context);
  if (!authorization.authorized) {
    return NextResponse.json(
      {
        error: "Payment denied by policy.",
        policyDecision: authorization.decision,
      },
      { status: 403 },
    );
  }

  try {
    const result = await submitPayment(authorization.transactionRequest);

    const httpStatus = result.status === "confirmed" ? 200 : 422;
    return NextResponse.json(
      { ...result, policyDecision: authorization.decision },
      { status: httpStatus },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit the transaction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");

  if (!hash || !hash.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'hash' is required to verify a transaction." },
      { status: 400 },
    );
  }

  try {
    const result = await verifyTransaction(hash.trim());
    const httpStatus = result.status === "confirmed" ? 200 : 404;
    return NextResponse.json(result, { status: httpStatus });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify the transaction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

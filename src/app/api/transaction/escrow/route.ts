import { NextResponse } from "next/server";
import {
  authorizePaymentProposal,
  createPolicyContextFromEnvironment,
  PolicyConfigurationError,
} from "@/lib/policy";
import {
  submitEscrowCreate,
  submitEscrowFinish,
  submitEscrowCancel,
} from "@/lib/xrpl";

interface EscrowRouteBody {
  action?: "create" | "finish" | "cancel";
  proposal?: unknown;
  cancelAfterSeconds?: number;
  escrowSequence?: number;
  proposalId?: string;
  ownerAddress?: string;
  reason?: string;
}

export async function POST(request: Request) {
  let body: EscrowRouteBody;

  try {
    body = (await request.json()) as EscrowRouteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action ?? "create";

  if (action === "create") {
    if (!body.proposal) {
      return NextResponse.json(
        { error: "Payment proposal is required to create an escrow." },
        { status: 400 },
      );
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

    // Re-evaluate proposal snapshot at the execution boundary
    const authorization = await authorizePaymentProposal(body.proposal, context);
    if (!authorization.authorized) {
      return NextResponse.json(
        {
          error: "Escrow creation denied by policy.",
          policyDecision: authorization.decision,
        },
        { status: 403 },
      );
    }

    try {
      const txRequest = authorization.transactionRequest;
      const result = await submitEscrowCreate({
        proposalId: txRequest.proposalId,
        destination: txRequest.destination,
        amount: txRequest.amount,
        currency: txRequest.currency,
        cancelAfterSeconds: body.cancelAfterSeconds,
        reason: body.reason,
      });

      const httpStatus = result.status === "confirmed" ? 200 : 422;
      return NextResponse.json(
        { ...result, policyDecision: authorization.decision },
        { status: httpStatus },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit the escrow creation transaction.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === "finish") {
    if (
      typeof body.escrowSequence !== "number" ||
      body.escrowSequence <= 0 ||
      !body.proposalId
    ) {
      return NextResponse.json(
        {
          error:
            "escrowSequence (positive integer) and proposalId are required to finish an escrow.",
        },
        { status: 400 },
      );
    }

    try {
      const result = await submitEscrowFinish({
        proposalId: body.proposalId,
        escrowSequence: body.escrowSequence,
        ownerAddress: body.ownerAddress,
        reason: body.reason,
      });

      const httpStatus = result.status === "confirmed" ? 200 : 422;
      return NextResponse.json(result, { status: httpStatus });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit the escrow finish transaction.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === "cancel") {
    if (
      typeof body.escrowSequence !== "number" ||
      body.escrowSequence <= 0 ||
      !body.proposalId
    ) {
      return NextResponse.json(
        {
          error:
            "escrowSequence (positive integer) and proposalId are required to cancel an escrow.",
        },
        { status: 400 },
      );
    }

    try {
      const result = await submitEscrowCancel({
        proposalId: body.proposalId,
        escrowSequence: body.escrowSequence,
        ownerAddress: body.ownerAddress,
        reason: body.reason,
      });

      const httpStatus = result.status === "confirmed" ? 200 : 422;
      return NextResponse.json(result, { status: httpStatus });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit the escrow cancel transaction.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: `Unsupported escrow action: "${action}"` },
    { status: 400 },
  );
}

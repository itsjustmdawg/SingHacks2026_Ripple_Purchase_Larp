import { NextResponse } from "next/server";
import { submitPayment, verifyTransaction } from "@/lib/xrpl";
import type { ExtendedTransactionRequest } from "@/lib/xrpl";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const req = body as Partial<ExtendedTransactionRequest>;

  if (!req.proposalId || typeof req.proposalId !== "string" || !req.proposalId.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid required field: 'proposalId' must be a non-empty string." },
      { status: 400 },
    );
  }

  if (!req.destination || typeof req.destination !== "string" || !req.destination.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid required field: 'destination' must be a non-empty classic address string." },
      { status: 400 },
    );
  }

  if (typeof req.amount !== "number" || !Number.isFinite(req.amount) || req.amount <= 0) {
    return NextResponse.json(
      { error: "Missing or invalid required field: 'amount' must be a positive finite number." },
      { status: 400 },
    );
  }

  if (req.currency !== "XRP") {
    return NextResponse.json(
      { error: "Unsupported currency: only 'XRP' is currently supported." },
      { status: 400 },
    );
  }

  try {
    const result = await submitPayment({
      proposalId: req.proposalId.trim(),
      destination: req.destination.trim(),
      amount: req.amount,
      currency: "XRP",
      reason: typeof req.reason === "string" ? req.reason : undefined,
      destinationTag: typeof req.destinationTag === "number" ? req.destinationTag : undefined,
    });

    const httpStatus = result.status === "confirmed" ? 200 : 422;
    return NextResponse.json(result, { status: httpStatus });
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

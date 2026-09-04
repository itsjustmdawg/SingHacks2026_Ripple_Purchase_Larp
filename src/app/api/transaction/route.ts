import { NextResponse } from "next/server";

import { NotImplementedError } from "@/lib/utils";
import { submitPayment } from "@/lib/xrpl";
import type { TransactionRequest } from "@/types";

export async function POST(request: Request) {
  let transactionRequest: TransactionRequest;

  try {
    transactionRequest = (await request.json()) as TransactionRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await submitPayment(transactionRequest);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return NextResponse.json({ error: error.message }, { status: 501 });
    }

    return NextResponse.json(
      { error: "Unable to submit the transaction." },
      { status: 500 },
    );
  }
}

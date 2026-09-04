import { NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/xrpl";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");

  if (!hash || !hash.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'hash' is required." },
      { status: 400 },
    );
  }

  const result = await verifyTransaction(hash.trim());
  return NextResponse.json(result, {
    status: result.status === "confirmed" ? 200 : 404,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const hash = (body as { hash?: string })?.hash;
  if (!hash || typeof hash !== "string" || !hash.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid field: 'hash' is required." },
      { status: 400 },
    );
  }

  const result = await verifyTransaction(hash.trim());
  return NextResponse.json(result, {
    status: result.status === "confirmed" ? 200 : 404,
  });
}

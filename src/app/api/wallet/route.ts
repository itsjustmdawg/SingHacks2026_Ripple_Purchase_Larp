import { NextResponse } from "next/server";
import { getWalletInfo } from "@/lib/xrpl";

export async function GET() {
  try {
    const walletInfo = await getWalletInfo();
    return NextResponse.json(walletInfo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load wallet information.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

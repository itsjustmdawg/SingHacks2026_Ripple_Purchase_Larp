import { NextResponse } from "next/server";
import { simulateVendorDelivery } from "@/lib/catalog";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      offerId?: string;
      simulateGhosting?: boolean;
    };
    const offerId = body.offerId || "default-service";
    const receipt = simulateVendorDelivery(offerId, body.simulateGhosting ?? false);

    return NextResponse.json(receipt);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }
}

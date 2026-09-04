import { NextResponse } from "next/server";

import { createPaymentProposal } from "@/lib/agent";
import { NotImplementedError } from "@/lib/utils";
import type { AgentRequest } from "@/types";

export async function POST(request: Request) {
  let agentRequest: AgentRequest;

  try {
    agentRequest = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const proposal = await createPaymentProposal(agentRequest);
    return NextResponse.json(proposal);
  } catch (error) {
    if (error instanceof NotImplementedError) {
      return NextResponse.json({ error: error.message }, { status: 501 });
    }

    return NextResponse.json(
      { error: "Unable to create a payment proposal." },
      { status: 500 },
    );
  }
}

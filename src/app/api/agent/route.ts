import { NextResponse } from "next/server";

import {
  AgentRequestValidationError,
  createConfiguredAgentModel,
  createPaymentProposal,
} from "@/lib/agent";
import type { AgentRequest } from "@/types";

export async function POST(request: Request) {
  let agentRequest: AgentRequest;

  try {
    agentRequest = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const proposal = await createPaymentProposal(agentRequest, {
      model: createConfiguredAgentModel(),
    });
    return NextResponse.json(proposal);
  } catch (error) {
    if (error instanceof AgentRequestValidationError) {
      return NextResponse.json(
        { error: error.message, issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Unable to create a payment proposal." },
      { status: 500 },
    );
  }
}

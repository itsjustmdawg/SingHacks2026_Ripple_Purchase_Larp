import { NextResponse } from "next/server";

import { AgentRequestValidationError } from "@/lib/agent";
import { runMultiAgentPipeline } from "@/lib/agents";
import { PolicyConfigurationError } from "@/lib/policy";
import type { AgentRequest } from "@/types";

export async function POST(request: Request) {
  let agentRequest: AgentRequest;

  try {
    agentRequest = (await request.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await runMultiAgentPipeline(agentRequest);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AgentRequestValidationError) {
      return NextResponse.json(
        { error: error.message, issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof PolicyConfigurationError) {
      return NextResponse.json(
        { error: "Policy configuration is invalid.", issues: error.issues },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Unable to run the multi-agent pipeline." },
      { status: 500 },
    );
  }
}

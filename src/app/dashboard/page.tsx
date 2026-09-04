import Link from "next/link";

import { FlowStage } from "@/components/shared/FlowStage";

const stages = [
  {
    title: "User Objective",
    description:
      "Capture the outcome the user wants the payment agent to achieve.",
  },
  {
    title: "Agent Decision",
    description:
      "Display the structured payment proposal and the agent's stated reason.",
  },
  {
    title: "Policy Evaluation",
    description:
      "Show the independent rules checked and whether the proposal is approved.",
  },
  {
    title: "XRPL Transaction",
    description:
      "Track construction, signing, submission, and confirmation after approval.",
  },
  {
    title: "Transaction Proof",
    description:
      "Present the verified transaction hash, ledger index, and explorer link.",
  },
] as const;

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          href="/"
        >
          ← Back to overview
        </Link>
        <div className="mt-8 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">
            Workflow preview
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Payment dashboard
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            This scaffold exposes the intended product flow. Interactive agent
            and XRPL integrations are deliberately not connected yet.
          </p>
        </div>
        <div className="mt-8 grid gap-4">
          {stages.map((stage, index) => (
            <FlowStage
              description={stage.description}
              key={stage.title}
              step={index + 1}
              title={stage.title}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

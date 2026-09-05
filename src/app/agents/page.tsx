import { agents } from "@/data/product";
import { AgentCard } from "@/components/agents/AgentCard";
import { PageHeader, ActionLink } from "@/components/ui/brand";
export const metadata = { title: "Your agent team" };
export default function Page() {
  return (
    <main id="main" className="wrap page-main">
      <PageHeader
        eyebrow="THE SPECIALISTS"
        title="Five roles. One objective."
        description="Each specialist owns a step in your purchase. Follow their decisions from the first search to the final receipt."
      >
        <ActionLink href="/launch">Put them to work</ActionLink>
      </PageHeader>
      <div className="agent-grid full-fleet">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
      <div className="info-banner">
        The team runs on demand when you start a purchase. Only Scout and
        Analyst call Gemini; treasury, policy and settlement run independently.
      </div>
    </main>
  );
}

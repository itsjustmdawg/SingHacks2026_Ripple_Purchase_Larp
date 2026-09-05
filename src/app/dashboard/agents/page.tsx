import { agents } from "@/data/product";
import { AgentCard } from "@/components/agents/AgentCard";
import { PageHeader, ActionLink } from "@/components/ui/brand";
import { WorkspaceNav } from "@/components/dashboard/WorkspaceNav";
export default function Page() {
  return (
    <main id="main" className="wrap page-main">
      <WorkspaceNav />
      <PageHeader
        eyebrow="YOUR TEAM"
        title="Ready when you are."
        description="Five specialists, configured to work together on each purchase. They run on demand, with your review before payment."
      >
        <ActionLink href="/launch">Start a new purchase</ActionLink>
      </PageHeader>
      <div className="agent-grid full-fleet">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </main>
  );
}

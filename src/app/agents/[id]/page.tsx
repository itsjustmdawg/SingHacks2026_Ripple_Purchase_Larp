import { notFound } from "next/navigation";
import { agents } from "@/data/product";
import { AgentCore } from "@/components/visual/AgentCore";
import { ActionLink, Eyebrow } from "@/components/ui/brand";
import { Check, ArrowRight } from "lucide-react";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = agents.find((x) => x.id === id);
  if (!a) notFound();
  return (
    <main id="main" className="wrap page-main">
      <div className="detail-grid">
        <div>
          <Eyebrow>{a.role}</Eyebrow>
          <div className="detail-title">
            <span className={"agent-avatar avatar-" + a.id}>{a.initials}</span>
            <h1>{a.name}</h1>
          </div>
          <p className="section-copy">{a.description}</p>
          <div className="chips">
            <span className="tag">{a.engine}</span>
            <span className="tag">Step {a.step} of 05</span>
            <span className="tag">XRPL Testnet</span>
          </div>
          <div className="detail-actions">
            <ActionLink href="/launch">Launch a purchase</ActionLink>
            <ActionLink href="/activity" secondary>
              View your activity
            </ActionLink>
          </div>
          <h2 className="small-heading">What this specialist does</h2>
          <ul className="capability-list">
            {a.capabilities.map((c) => (
              <li key={c}>
                <Check size={17} />
                {c}
              </li>
            ))}
          </ul>
          <div className="info-banner">
            Included in the purchase team. No separate agent hire fee. Model
            usage is billed or rate-limited by your Gemini project.
          </div>
        </div>
        <AgentCore compact />
      </div>
      <div className="agent-handoff">
        {agents.map((x) => (
          <div className={x.id === a.id ? "handoff-active" : ""} key={x.id}>
            <span>{x.step}</span>
            {x.name}
            <ArrowRight size={16} />
          </div>
        ))}
      </div>
    </main>
  );
}

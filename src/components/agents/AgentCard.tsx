import Link from "next/link";
import {
  ArrowUpRight,
  ScanLine,
  ChartNoAxesCombined,
  Wallet,
  ShieldCheck,
  Network,
} from "lucide-react";
import type { AgentProfile } from "@/data/product";
const icons = {
  scout: ScanLine,
  analyst: ChartNoAxesCombined,
  treasury: Wallet,
  policy: ShieldCheck,
  xrpl: Network,
};
export function AgentCard({ agent }: { agent: AgentProfile }) {
  const Icon = icons[agent.id as keyof typeof icons] ?? ScanLine;
  return (
    <Link className="agent-card" href={"/agents/" + agent.id}>
      <div className="agent-card-top">
        <span className={"agent-avatar avatar-" + agent.id}>
          <Icon size={25} />
        </span>
        <span className="tag">{agent.engine}</span>
      </div>
      <span className="micro">{agent.role}</span>
      <h3>
        {agent.name}
        <ArrowUpRight size={20} />
      </h3>
      <p>{agent.description}</p>
      <div className="agent-tags">
        {agent.capabilities.slice(0, 2).map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className="agent-card-bottom">
        <span>
          <i className="status-dot" />
          Part of your team
        </span>
        <span>{agent.step} / 05</span>
      </div>
    </Link>
  );
}

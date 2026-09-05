import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { AgentCore } from "@/components/visual/AgentCore";
import { ActionLink, Eyebrow, TextLink } from "@/components/ui/brand";
import { AgentCard } from "@/components/agents/AgentCard";
import { agents } from "@/data/product";
const code =
  "const result = await fetch('/api/agents/orchestrate', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    id: crypto.randomUUID(),\n    userMessage: 'Find cloud storage under 5 XRP',\n    timestamp: new Date().toISOString()\n  })\n});\n\n// Review the proposal. Then approve payment.";
export default function Home() {
  return (
    <main id="main">
      <section className="hero">
        <div className="hero-curtain" />
        <div className="hero-grain" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <Eyebrow>THE AUTONOMOUS ECONOMY</Eyebrow>
            <h1>
              Less busywork.
              <br />
              <strong>
                More <span>agency.</span>
              </strong>
            </h1>
            <p>
              Your next purchase, handled. Let a team of AI agents find the
              right service, compare the options, and prepare the payment. You
              make the final call.
            </p>
            <div className="hero-actions">
              <ActionLink href="/marketplace">Explore marketplace</ActionLink>
              <ActionLink href="/launch" secondary>
                Meet your agent team
              </ActionLink>
            </div>
            <div className="hero-proof">
              <ShieldCheck size={15} />
              <span>Your budget. Your approval. Verified on XRPL.</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="telemetry telemetry-top">
              <span className="micro">SPECIALIST AGENTS</span>
              <strong>
                05<span> / one shared objective</span>
              </strong>
            </div>
            <AgentCore />
            <div className="telemetry telemetry-bottom">
              <span className="micro">HUMAN IN THE LOOP</span>
              <strong>
                You<span> control the final payment</span>
              </strong>
            </div>
          </div>
          <div className="hero-bottom">
            <a href="#how-it-works" className="scroll-cue">
              <ArrowDown size={24} />
              <span>DISCOVER THE POSSIBILITIES</span>
            </a>
            <span className="hero-edition">
              SINGHACKS 2026 <span>↗</span> BUILT ON XRPL
            </span>
          </div>
        </div>
      </section>
      <div className="activity-band">
        <div className="wrap activity-band-inner">
          <span className="micro">ONE CONNECTED WORKFLOW</span>
          {["Discover", "Compare", "Authorize", "Review", "Settle"].map(
            (label, i) => (
              <span key={label}>
                <i>{String(i + 1).padStart(2, "0")}</i>
                {label}
                <ArrowRight size={14} />
              </span>
            ),
          )}
          <span className="band-note">XRP · TESTNET</span>
        </div>
      </div>
      <section className="wrap editorial section" id="how-it-works">
        <div className="section-heading">
          <div>
            <Eyebrow>FROM INTENT TO RECEIPT</Eyebrow>
            <h2>
              One request.
              <br />
              <span>A whole team behind it.</span>
            </h2>
          </div>
          <p>
            Skip the tabs, comparisons and manual handoffs. Give your agents an
            objective and a budget. Follow every decision, all the way to the
            ledger.
          </p>
        </div>
        <div className="story-grid">
          {[
            {
              n: "01",
              title: "Find your fit.",
              text: "Ask for cloud storage, API credits, compute or an office chair. Scout finds relevant options in the demo marketplace.",
              glyph: "↗",
              label: "DISCOVERY",
            },
            {
              n: "02",
              title: "Make a better call.",
              text: "Analyst compares providers against your needs. Independent rules check the budget before a proposal reaches you.",
              glyph: "≋",
              label: "INTELLIGENCE",
            },
            {
              n: "03",
              title: "Make it official.",
              text: "Review the exact amount and recipient. Approve the Testnet payment and get a transaction receipt you can verify.",
              glyph: "↳",
              label: "SETTLEMENT",
            },
          ].map((x) => (
            <article className="story-card" key={x.n}>
              <span className="story-number">{x.n}</span>
              <div className="story-glyph">{x.glyph}</div>
              <span className="micro">{x.label}</span>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section fleet-section">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <Eyebrow>BUILT TO WORK TOGETHER</Eyebrow>
              <h2>
                Small team.
                <br />
                <span>Serious capabilities.</span>
              </h2>
            </div>
            <TextLink href="/agents">Meet all five specialists</TextLink>
          </div>
          <div className="agent-grid">
            {agents.slice(0, 3).map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
          <p className="caption">
            Two Gemini agents for discovery and comparison. Dedicated components
            for treasury, policy and XRPL settlement.
          </p>
        </div>
      </section>
      <section id="control" className="section wrap trust-grid">
        <div>
          <Eyebrow>AUTONOMY, WITH BOUNDARIES</Eyebrow>
          <h2>
            Hands off the admin.
            <br />
            <span>Hands on the controls.</span>
          </h2>
          <p className="section-copy">
            Moving quickly shouldn’t mean giving up control. Every purchase
            passes an independent policy check, and every payment waits for your
            review.
          </p>
          <ActionLink href="/launch" secondary>
            See it in action
          </ActionLink>
        </div>
        <div className="policy-visual">
          <div className="panel-heading">
            <span>
              <ShieldCheck size={19} />
              The policy checkpoint
            </span>
            <span className="tag">BEFORE PAYMENT</span>
          </div>
          {[
            ["Spending limits", "Checked against server rules"],
            ["Recipient & amount", "Validated independently"],
            ["Your approval", "Required before signing"],
            ["Settlement network", "XRPL Testnet only"],
          ].map(([a, b]) => (
            <div className="policy-row" key={a}>
              <div>
                <span>{a}</span>
                <small>{b}</small>
              </div>
              <Check size={17} />
            </div>
          ))}
          <div className="policy-note">
            <span className="status-dot" />
            Agents propose. You authorize the payment.
          </div>
        </div>
      </section>
      <section className="wrap section developer-teaser">
        <div>
          <Eyebrow>BUILT IN THE OPEN</Eyebrow>
          <h2>
            Intent in.
            <br />
            <span>Evidence out.</span>
          </h2>
          <p className="section-copy">
            A typed API, readable decisions and an independently verifiable
            receipt. Follow the full purchase from request to settlement.
          </p>
          <TextLink href="/developers">Explore the developer guide</TextLink>
        </div>
        <div className="code-window">
          <div>
            <span className="window-dots">● ● ●</span>
            <span>purchase.ts</span>
            <span>TypeScript</span>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
          <p>
            <Sparkles size={15} />
            Real Gemini calls. Existing XRPL settlement.
          </p>
        </div>
      </section>
      <section className="final-cta">
        <div className="wrap">
          <Eyebrow>YOUR NEXT PURCHASE STARTS HERE</Eyebrow>
          <h2>
            Give your time
            <br />a better <em>job.</em>
          </h2>
          <ActionLink href="/launch">Launch your first purchase</ActionLink>
          <Link href="/marketplace" className="text-link">
            Or take a look around
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

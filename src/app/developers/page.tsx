import { PageHeader, ActionLink } from "@/components/ui/brand";
import { brand } from "@/data/product";
export const metadata = { title: "Developer guide" };
const sample =
  "const proposal = await fetch('/api/agents/orchestrate', {\n  method: 'POST',\n  credentials: 'same-origin',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    id: crypto.randomUUID(),\n    userMessage: 'Find storage under 5 XRP',\n    timestamp: new Date().toISOString()\n  })\n}).then(response => response.json());\n\n// Inspect proposal.trace and proposal.policyDecision.\n// Review proposal.proposal before submitting payment.";
export default function Page() {
  return (
    <main id="main" className="wrap page-main">
      <PageHeader
        eyebrow="FOR THE BUILDERS"
        title="Understand every handoff."
        description="A TypeScript application that connects Gemini procurement to independent policy checks and XRP Ledger settlement."
      >
        <ActionLink href={brand.github} secondary>
          Explore the source
        </ActionLink>
      </PageHeader>
      <div className="developer-grid">
        <div>
          <div className="docs-block">
            <h2>The purchase contract</h2>
            <p>
              Send an objective to the orchestrator from a signed-in workspace.
              It returns catalog matches, the selected offer, a payment
              proposal, policy results and concise decision summaries.
            </p>
          </div>
          <div className="docs-block">
            <h2>What is live?</h2>
            <ul>
              <li>Gemini calls for Scout and Analyst.</li>
              <li>Independent policy validation.</li>
              <li>XRPL Testnet wallet, submission and verification.</li>
              <li>Session login and a final human review.</li>
            </ul>
          </div>
          <div className="docs-block">
            <h2>What is illustrative?</h2>
            <p>
              Vendor listings, prices and catalog reliability are demo data.
              There is no real product fulfillment, agent publishing,
              cross-chain payment or negotiation service. Browser receipts are
              local history, not a shared account database.
            </p>
          </div>
        </div>
        <div>
          <div className="code-window">
            <div>
              <span className="window-dots">● ● ●</span>
              <span>purchase.ts</span>
              <span>TypeScript</span>
            </div>
            <pre>
              <code>{sample}</code>
            </pre>
          </div>
          <div style={{ marginTop: 30 }}>
            {[
              [
                "POST",
                "/api/agents/orchestrate",
                "Discover, compare, propose and check policy.",
              ],
              [
                "POST",
                "/api/transaction",
                "Recheck policy and submit the reviewed proposal.",
              ],
              [
                "GET",
                "/api/transaction/verify?hash=…",
                "Check the transaction on XRPL Testnet.",
              ],
              ["GET", "/api/wallet", "Get public wallet address and balances."],
            ].map(([method, path, text]) => (
              <div className="endpoint" key={path}>
                <span>{method}</span>
                <div>
                  <code>{path}</code>
                  <small>{text}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="info-banner">
        All purchase and wallet endpoints require a signed session. The
        hackathon login represents one shared demo workspace, not separate
        customer wallets. Keep Gemini credentials and wallet seeds in server
        environment variables.
      </div>
    </main>
  );
}

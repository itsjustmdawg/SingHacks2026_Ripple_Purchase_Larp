import { FlowStage } from "@/components/FlowStage";

const stages = [
  { title: "Objective", status: "Ready" },
  { title: "Agent Proposal", status: "Pending" },
  { title: "Policy Check", status: "Waiting" },
  { title: "XRPL Payment", status: "Waiting" },
] as const;

async function getBackendStatus() {
  const fallback = { status: "offline", network: "testnet" };
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8787";

  try {
    const response = await fetch(`${backendUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as typeof fallback;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const backend = await getBackendStatus();

  return (
    <main>
      <div className="shell">
        <header>
          <div>
            <p className="eyebrow">XRPL Testnet</p>
            <h1>Purchase Larp Dashboard</h1>
          </div>
          <p className="muted">TypeScript UI skeleton</p>
        </header>

        <section className="topGrid">
          <div className="panel">
            <h2>Customer Objective</h2>
            <div className="objectiveBox">
              Find a purchasable product, compare options, request approval, and
              prepare an XRPL-backed payment.
            </div>
          </div>

          <div className="panel">
            <h2>Payment Summary</h2>
            <dl>
              <div>
                <dt>Budget</dt>
                <dd>Not set</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>{backend.network}</dd>
              </div>
              <div>
                <dt>Backend</dt>
                <dd>{backend.status}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="stageGrid">
          {stages.map((stage) => (
            <FlowStage
              key={stage.title}
              status={stage.status}
              title={stage.title}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

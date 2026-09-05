"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AgentTraceEvent,
  CatalogOffer,
  MultiAgentPipelineResult,
  PaymentProposal,
  PolicyDecision,
  TransactionResult,
} from "@/types";

type WorkflowStatus =
  | "idle"
  | "planning"
  | "review"
  | "submitting"
  | "confirmed"
  | "failed";

interface WalletInfo {
  address: string;
  balanceXrp: number;
  spendableXrp: number;
  reservedXrp: number;
  ownerCount: number;
  isFunded: boolean;
}

interface TransactionResponse extends TransactionResult {
  policyDecision: PolicyDecision;
}

interface VerificationResponse extends TransactionResult {
  sender?: string;
  destination?: string;
  deliveredXrp?: number;
}

const DEFAULT_OBJECTIVE = "Find the best encrypted cloud storage under 5 XRP";

const examples = [
  {
    label: "Chair",
    value: "Find the best chair under 5 XRP",
  },
  {
    label: "Analytics",
    value: "Choose the best market analytics subscription within 5 XRP",
  },
  {
    label: "Cloud storage",
    value: DEFAULT_OBJECTIVE,
  },
  {
    label: "API credits",
    value: "Buy the most reliable API credits under 4.5 XRP",
  },
  {
    label: "Compute",
    value: "Find a fast compute service with a maximum budget of 5 XRP",
  },
] as const;

function compactAddress(value: string): string {
  if (value.length < 18) return value;
  return `${value.slice(0, 9)}…${value.slice(-7)}`;
}

function formatXrp(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-SG", {
    maximumFractionDigits: 6,
  }).format(value);
}

function getResponseError(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return fallback;
}

async function fetchWalletInfo(signal?: AbortSignal): Promise<WalletInfo> {
  const response = await fetch("/api/wallet", {
    cache: "no-store",
    signal,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(getResponseError(body, "Unable to connect to the wallet."));
  }
  return body as WalletInfo;
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 12.5 4.2 4.2L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
      {online ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
      ) : null}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`}
      />
    </span>
  );
}

const agentAppearance = {
  market_scout: { glyph: "MS", color: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" },
  deal_analyst: { glyph: "DA", color: "border-indigo-300/20 bg-indigo-300/10 text-indigo-200" },
  treasury: { glyph: "TR", color: "border-violet-300/20 bg-violet-300/10 text-violet-200" },
  policy_engine: { glyph: "PE", color: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" },
  xrpl_agent: { glyph: "XR", color: "border-amber-300/20 bg-amber-300/10 text-amber-200" },
} as const;

function createXrplTrace(
  proposalId: string,
  status: AgentTraceEvent["status"],
  message: string,
): AgentTraceEvent {
  return {
    id: `${proposalId}:xrpl`,
    agent: "xrpl_agent",
    label: "XRPL Agent",
    status,
    engine: "xrpl",
    message,
    timestamp: new Date().toISOString(),
  };
}

function StageTracker({
  status,
  trace,
}: {
  status: WorkflowStatus;
  trace: AgentTraceEvent[];
}) {
  const activeIndex = (() => {
    if (status === "confirmed") return 6;
    if (status === "review" || status === "submitting") return 5;
    if (status === "idle") return 1;
    if (trace.some((event) => event.agent === "xrpl_agent")) return 5;
    if (trace.some((event) => event.agent === "policy_engine")) return 4;
    if (trace.some((event) => event.agent === "deal_analyst")) return 3;
    return 2;
  })();
  const stages = ["Objective", "Scout", "Analyst", "Policy", "XRPL"];

  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Payment workflow">
      {stages.map((stage, index) => {
        const number = index + 1;
        const complete = number < activeIndex || status === "confirmed";
        const current = number === activeIndex && status !== "confirmed";

        return (
          <li className="relative" key={stage}>
            {index < stages.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-px ${number < activeIndex ? "bg-cyan-400" : "bg-slate-700"}`}
              />
            ) : null}
            <div className="relative flex flex-col items-center text-center">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold transition ${
                  complete
                    ? "border-cyan-400 bg-cyan-400 text-slate-950"
                    : current
                      ? "border-cyan-300 bg-cyan-300/10 text-cyan-200 shadow-[0_0_0_4px_rgba(34,211,238,0.08)]"
                      : "border-slate-700 bg-slate-900 text-slate-500"
                }`}
              >
                {complete ? <CheckIcon /> : number}
              </span>
              <span
                className={`mt-2 text-[11px] font-semibold sm:text-xs ${complete || current ? "text-slate-200" : "text-slate-600"}`}
              >
                {stage}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function OfferCard({
  offer,
  pipeline,
}: {
  offer: CatalogOffer;
  pipeline: MultiAgentPipelineResult;
}) {
  const evaluation = pipeline.analysis.evaluations.find(
    (candidate) => candidate.offerId === offer.id,
  );
  const selected = pipeline.analysis.selectedOffer?.id === offer.id;

  return (
    <li
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-cyan-300/35 bg-cyan-300/[0.07]"
          : evaluation?.eligible === false
            ? "border-rose-300/10 bg-rose-300/[0.025] opacity-65"
            : "border-white/8 bg-white/[0.025]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-200">
            {offer.provider}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-600">
            {offer.service}
          </p>
        </div>
        <strong className="shrink-0 text-xs text-cyan-200">
          {formatXrp(offer.priceXrp)} XRP
        </strong>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <span>{offer.uptimePercent}% uptime</span>
        <span>
          {evaluation?.eligible === false
            ? "Over budget"
            : selected
              ? `Selected · ${evaluation?.score ?? "—"}/100`
              : `${evaluation?.score ?? "—"}/100`}
        </span>
      </div>
    </li>
  );
}

function CollaborationFeed({ trace }: { trace: AgentTraceEvent[] }) {
  return (
    <ol className="mt-5 space-y-3" aria-live="polite">
      {trace.map((event, index) => {
        const appearance = agentAppearance[event.agent];
        const isFailure = event.status === "denied" || event.status === "failed";
        const isWorking = event.status === "working";

        return (
          <li className="relative flex gap-3" key={event.id}>
            {index < trace.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute bottom-[-14px] left-[17px] top-9 w-px bg-white/8"
              />
            ) : null}
            <span
              className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-[10px] font-black tracking-tight ${appearance.color}`}
            >
              {isWorking ? <Spinner /> : appearance.glyph}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-[#07101f]/75 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">{event.label}</p>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[9px] font-bold tracking-wide text-cyan-200 uppercase">
                    {event.engine === "gemini" && event.model
                      ? `Gemini · ${event.model}`
                      : event.engine}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                      isFailure
                        ? "bg-rose-300/10 text-rose-300"
                        : isWorking
                          ? "bg-amber-300/10 text-amber-300"
                          : "bg-emerald-300/10 text-emerald-300"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 break-words text-xs leading-5 text-slate-400">
                {event.message}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PaymentDashboard() {
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [pipeline, setPipeline] = useState<MultiAgentPipelineResult | null>(null);
  const [trace, setTrace] = useState<AgentTraceEvent[]>([]);
  const [proposal, setProposal] = useState<PaymentProposal | null>(null);
  const [policy, setPolicy] = useState<PolicyDecision | null>(null);
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      setWallet(await fetchWalletInfo());
    } catch (caught) {
      setWalletError(
        caught instanceof Error ? caught.message : "Unable to connect to the wallet.",
      );
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchWalletInfo(controller.signal)
      .then((walletInfo) => {
        if (!active) return;
        setWallet(walletInfo);
        setWalletError(null);
      })
      .catch((caught: unknown) => {
        if (!active || (caught instanceof DOMException && caught.name === "AbortError")) {
          return;
        }
        setWalletError(
          caught instanceof Error
            ? caught.message
            : "Unable to connect to the wallet.",
        );
      })
      .finally(() => {
        if (active) setWalletLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const canAnalyze =
    objective.trim().length > 0 &&
    status !== "planning" &&
    status !== "submitting";
  const canSubmit =
    proposal?.action === "payment" &&
    policy?.approved === true &&
    reviewConfirmed &&
    status !== "submitting";

  const amountShare = useMemo(() => {
    if (!proposal || !wallet?.spendableXrp || wallet.spendableXrp <= 0) return 0;
    return Math.min((proposal.amount / wallet.spendableXrp) * 100, 100);
  }, [proposal, wallet]);

  async function analyzeObjective() {
    if (!canAnalyze) return;

    setStatus("planning");
    setPipeline(null);
    setTrace([
      {
        id: "scout-working",
        agent: "market_scout",
        label: "Market Scout",
        status: "working",
        engine: "pending",
        message: "Searching the mock marketplace for matching offers…",
        timestamp: new Date().toISOString(),
      },
    ]);
    setProposal(null);
    setPolicy(null);
    setTransaction(null);
    setVerification(null);
    setReviewConfirmed(false);
    setError(null);

    try {
      const requestId = `ui-${Date.now()}`;
      const agentResponse = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          userMessage: objective.trim(),
          timestamp: new Date().toISOString(),
        }),
      });
      const agentBody: unknown = await agentResponse.json();
      if (!agentResponse.ok) {
        throw new Error(
          getResponseError(agentBody, "The agent team could not process this objective."),
        );
      }

      const nextPipeline = agentBody as MultiAgentPipelineResult;
      setPipeline(nextPipeline);
      setTrace(nextPipeline.trace);
      setProposal(nextPipeline.proposal);
      setPolicy(nextPipeline.policyDecision);
      if (!nextPipeline.proposal) {
        setStatus("failed");
        setError("No catalog offer matched the objective and user budget.");
      } else if (!nextPipeline.policyDecision?.approved) {
        setStatus("failed");
        setError("Policy denied this proposal. Review the failed rules below.");
      } else {
        setStatus("review");
      }
    } catch (caught) {
      setStatus("failed");
      setError(
        caught instanceof Error ? caught.message : "Unable to analyze the objective.",
      );
    }
  }

  async function submitPayment() {
    if (!proposal || !canSubmit) return;

    setStatus("submitting");
    setTransaction(null);
    setVerification(null);
    setError(null);
    setTrace((current) => [
      ...current.filter((event) => event.agent !== "xrpl_agent"),
      createXrplTrace(
        proposal.id,
        "working",
        "Re-checking policy, signing locally, and broadcasting to XRPL Testnet…",
      ),
    ]);

    try {
      const response = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const transactionFailure = body as Partial<TransactionResponse>;
        if (transactionFailure.policyDecision) {
          setPolicy(transactionFailure.policyDecision);
        }
        throw new Error(
          getResponseError(body, "The Testnet transaction was not confirmed."),
        );
      }

      const nextTransaction = body as TransactionResponse;
      setTransaction(nextTransaction);
      setPolicy(nextTransaction.policyDecision);

      if (nextTransaction.hash) {
        const verifyResponse = await fetch(
          `/api/transaction/verify?hash=${encodeURIComponent(nextTransaction.hash)}`,
          { cache: "no-store" },
        );
        const verifyBody: unknown = await verifyResponse.json();
        if (verifyResponse.ok) {
          setVerification(verifyBody as VerificationResponse);
        }
      }

      setStatus("confirmed");
      setTrace((current) => [
        ...current.filter((event) => event.agent !== "xrpl_agent"),
        createXrplTrace(
          proposal.id,
          "confirmed",
          `Validated on XRPL Testnet${nextTransaction.ledgerIndex ? ` in ledger ${nextTransaction.ledgerIndex}` : ""}; receipt ${nextTransaction.hash ?? "recorded"}.`,
        ),
      ]);
      void loadWallet();
    } catch (caught) {
      setStatus("failed");
      const message =
        caught instanceof Error ? caught.message : "Unable to submit the payment.";
      setTrace((current) => [
        ...current.filter((event) => event.agent !== "xrpl_agent"),
        createXrplTrace(proposal.id, "failed", `Settlement stopped: ${message}`),
      ]);
      setError(
        message,
      );
    }
  }

  function resetWorkflow() {
    setStatus("idle");
    setPipeline(null);
    setTrace([]);
    setProposal(null);
    setPolicy(null);
    setTransaction(null);
    setVerification(null);
    setReviewConfirmed(false);
    setError(null);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07101f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.10),transparent_28rem),radial-gradient(circle_at_88%_18%,rgba(99,102,241,0.10),transparent_26rem)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 32 32">
                <path
                  d="M8 9.5c2.2 0 3.2 1 4.7 2.8l1.2 1.4c1.2 1.4 2.1 2.1 3.7 2.1s2.5-.7 3.7-2.1l2.3-2.7"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.4"
                />
                <path
                  d="M24 22.5c-2.2 0-3.2-1-4.7-2.8l-1.2-1.4c-1.2-1.4-2.1-2.1-3.7-2.1s-2.5.7-3.7 2.1L8.4 21"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.4"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Purchase LARP
                </h1>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-cyan-300 uppercase">
                  5-agent pipeline
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Autonomous procurement with policy-governed XRPL settlement
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-slate-300">
              <StatusDot online={wallet !== null && !walletError} />
              XRPL Testnet
            </div>
            <button
              className="group flex min-w-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-white/15 hover:bg-white/[0.06] disabled:cursor-wait"
              disabled={walletLoading}
              onClick={() => void loadWallet()}
              type="button"
            >
              {walletLoading ? <Spinner /> : <span className="h-2 w-2 rounded-full bg-indigo-400" />}
              <span className="max-w-36 truncate font-mono">
                {wallet
                  ? compactAddress(wallet.address)
                  : walletError
                    ? "Wallet unavailable"
                    : "Connecting wallet"}
              </span>
              {wallet ? (
                <strong className="shrink-0 font-semibold text-white">
                  {formatXrp(wallet.balanceXrp)} XRP
                </strong>
              ) : null}
            </button>
          </div>
        </header>

        <section className="pt-8 sm:pt-10">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.18em] text-cyan-300 uppercase">
              Autonomous checkout console
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
              Let agents find, compare, and pay.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Describe the outcome. Specialist agents scout the catalog, rank
              offers, build a proposal, pass an independent policy gate, and
              settle only after your review.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
            <section className="rounded-2xl border border-white/10 bg-[#0b1628]/90 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">
                    Purchase objective
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold text-white">
                    What should the agent team procure?
                  </h3>
                </div>
                <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  Natural language
                </span>
              </div>

              <label className="sr-only" htmlFor="payment-objective">
                Payment objective
              </label>
              <textarea
                className="mt-5 min-h-32 w-full resize-y rounded-xl border border-white/10 bg-[#07101f] px-4 py-3.5 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-3 focus:ring-cyan-300/8"
                disabled={status === "planning" || status === "submitting"}
                id="payment-objective"
                maxLength={2000}
                onChange={(event) => {
                  setObjective(event.target.value);
                  if (status !== "idle") resetWorkflow();
                }}
                placeholder="Find the best cloud storage under 5 XRP"
                value={objective}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium text-slate-600">Try:</span>
                {examples.map((example) => (
                  <button
                    className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-cyan-300/25 hover:text-cyan-200"
                    key={example.label}
                    onClick={() => {
                      setObjective(example.value);
                      resetWorkflow();
                    }}
                    type="button"
                  >
                    {example.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg aria-hidden="true" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M12 3 5.5 5.6v5.8c0 4.1 2.6 7.8 6.5 9.6 3.9-1.8 6.5-5.5 6.5-9.6V5.6L12 3Z"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="1.7"
                    />
                    <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                  </svg>
                  No payment is signed during analysis
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  disabled={!canAnalyze}
                  onClick={() => void analyzeObjective()}
                  type="button"
                >
                  {status === "planning" ? <Spinner /> : null}
                  {status === "planning" ? "Agents collaborating" : "Run agent team"}
                  {status === "planning" ? null : <ArrowIcon />}
                </button>
              </div>
            </section>

            <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <section className="rounded-2xl border border-white/10 bg-[#0b1628]/90 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-500 uppercase">
                      Agent wallet
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">
                      {walletLoading
                        ? "Connecting to Testnet…"
                        : wallet
                          ? wallet.isFunded
                            ? "Funded and ready"
                            : "Funding required"
                          : "Connection unavailable"}
                    </p>
                  </div>
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${wallet ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                    {walletLoading ? <Spinner /> : <StatusDot online={wallet !== null} />}
                  </span>
                </div>
                {wallet ? (
                  <dl className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.035] p-3">
                      <dt className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                        Spendable
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-white">
                        {formatXrp(wallet.spendableXrp)}
                        <span className="ml-1 text-[10px] text-slate-500">XRP</span>
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white/[0.035] p-3">
                      <dt className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                        Reserved
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-white">
                        {formatXrp(wallet.reservedXrp)}
                        <span className="ml-1 text-[10px] text-slate-500">XRP</span>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-xs leading-5 text-amber-200/80">
                    {walletError ?? "Waiting for the XRPL service."}
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-5">
                <p className="text-xs font-bold tracking-[0.14em] text-emerald-300/80 uppercase">
                  Guardrails active
                </p>
                <ul className="mt-4 space-y-3 text-xs text-slate-400">
                  {["Server-owned spend limits", "Independent policy gate", "Explicit review before signing"].map(
                    (guardrail) => (
                      <li className="flex items-center gap-2.5" key={guardrail}>
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                        {guardrail}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            </aside>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/8 bg-[#0b1628]/60 px-4 py-5 sm:px-8">
          <StageTracker status={status} trace={trace} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <article className="rounded-2xl border border-white/10 bg-[#0b1628]/90 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase">
                  Agent collaboration feed
                </p>
                <h3 className="mt-1.5 text-lg font-semibold text-white">
                  Auditable decision receipts
                </h3>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {trace.length} event{trace.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
              Each specialist exposes its result and hands structured data to the
              next stage. These are concise decision summaries, not hidden model reasoning.
            </p>

            {trace.length > 0 ? (
              <CollaborationFeed trace={trace} />
            ) : (
              <div className="mt-5 grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center">
                <div>
                  <p className="text-sm font-medium text-slate-400">Agent team is idle</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Run an objective to see the scout-to-settlement handoffs.
                  </p>
                </div>
              </div>
            )}
          </article>

          <aside className="rounded-2xl border border-white/10 bg-[#0b1628]/90 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-indigo-300 uppercase">
                  Quote comparison
                </p>
                <h3 className="mt-1.5 text-base font-semibold text-white">
                  Mock marketplace
                </h3>
              </div>
              {pipeline?.catalog.budgetXrp ? (
                <span className="rounded-full bg-indigo-300/10 px-2.5 py-1 text-[10px] font-bold text-indigo-200">
                  ≤ {formatXrp(pipeline.catalog.budgetXrp)} XRP
                </span>
              ) : null}
            </div>
            {pipeline ? (
              <ul className="mt-5 space-y-2.5">
                {pipeline.catalog.offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} pipeline={pipeline} />
                ))}
              </ul>
            ) : (
              <div className="mt-5 grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-5 text-center">
                <p className="text-xs leading-5 text-slate-600">
                  Provider prices, uptime, latency, and analyst scores appear here.
                </p>
              </div>
            )}
          </aside>
        </section>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-100" role="alert">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-400/15 text-xs font-bold text-rose-300">
              !
            </span>
            <div className="min-w-0">
              <strong className="font-semibold">Workflow stopped</strong>
              <p className="mt-1 break-words text-xs leading-5 text-rose-200/70">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="mt-5 grid gap-5 pb-10 lg:grid-cols-2">
          <article className="min-h-72 rounded-2xl border border-white/10 bg-[#0b1628]/90 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-indigo-300 uppercase">
                  Agent proposal
                </p>
                <h3 className="mt-1.5 text-lg font-semibold text-white">
                  Treasury payment proposal
                </h3>
              </div>
              {proposal ? (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${proposal.action === "payment" ? "bg-cyan-300/10 text-cyan-300" : "bg-amber-300/10 text-amber-300"}`}>
                  {proposal.action.replace("_", " ")}
                </span>
              ) : null}
            </div>

            {proposal ? (
              <div className="mt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/8 bg-[#07101f] p-4">
                    <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                      Amount
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {formatXrp(proposal.amount)} <span className="text-sm text-cyan-300">XRP</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-[#07101f] p-4">
                    <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                      Recipient
                    </p>
                    <p className="mt-2 truncate font-mono text-sm font-medium text-slate-200" title={proposal.recipient}>
                      {compactAddress(proposal.recipient)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/8 bg-[#07101f] p-4">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                    Decision summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{proposal.reason}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[10px] font-medium text-slate-600">Confidence</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <span className="block h-full rounded-full bg-indigo-400" style={{ width: `${proposal.confidence * 100}%` }} />
                    </span>
                    <span className="text-xs font-semibold text-indigo-300">
                      {Math.round(proposal.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid min-h-44 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center">
                <div>
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300">
                    {status === "planning" ? <Spinner /> : <span className="text-lg">✦</span>}
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-400">
                    {status === "planning" ? "Interpreting your objective…" : "No proposal yet"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Your agent’s structured decision appears here.</p>
                </div>
              </div>
            )}
          </article>

          <article className="min-h-72 rounded-2xl border border-white/10 bg-[#0b1628]/90 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-emerald-300 uppercase">
                  Policy & settlement
                </p>
                <h3 className="mt-1.5 text-lg font-semibold text-white">
                  Authorization and ledger proof
                </h3>
              </div>
              {policy ? (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${policy.approved ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                  {policy.approved ? "Approved" : "Denied"}
                </span>
              ) : null}
            </div>

            {policy ? (
              <div className="mt-5">
                <ul className="space-y-2">
                  {policy.rulesChecked.map((rule) => (
                    <li className="flex items-start gap-3 rounded-lg bg-white/[0.025] px-3 py-2.5" key={rule.rule}>
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${rule.passed ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                        {rule.passed ? <CheckIcon className="h-3 w-3" /> : <span className="text-[10px] font-bold">×</span>}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300">{rule.rule.replaceAll("-", " ")}</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{rule.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {policy.approved && !transaction ? (
                  <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
                    <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-300">
                      <input
                        checked={reviewConfirmed}
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 accent-cyan-300"
                        disabled={status === "submitting"}
                        onChange={(event) => setReviewConfirmed(event.target.checked)}
                        type="checkbox"
                      />
                      <span>
                        I reviewed the exact recipient and amount. Authorize this
                        payment on <strong className="font-semibold text-cyan-200">XRPL Testnet</strong>.
                      </span>
                    </label>
                    {proposal && wallet ? (
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                        <span className="block h-full rounded-full bg-cyan-400" style={{ width: `${amountShare}%` }} />
                      </div>
                    ) : null}
                    <button
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      disabled={!canSubmit}
                      onClick={() => void submitPayment()}
                      type="button"
                    >
                      {status === "submitting" ? <Spinner /> : <CheckIcon />}
                      {status === "submitting" ? "Submitting to XRPL…" : `Authorize & pay ${formatXrp(proposal?.amount)} XRP`}
                    </button>
                  </div>
                ) : null}

                {transaction ? (
                  <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-400 text-emerald-950">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-100">Payment confirmed</p>
                        <p className="text-[11px] text-emerald-200/55">
                          Validated in ledger {verification?.ledgerIndex ?? transaction.ledgerIndex ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg bg-black/15 p-3">
                      <p className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">Transaction hash</p>
                      <p className="mt-1.5 truncate font-mono text-xs text-slate-300" title={transaction.hash ?? undefined}>
                        {transaction.hash ?? "Hash unavailable"}
                      </p>
                    </div>
                    {transaction.explorerUrl ? (
                      <a
                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                        href={transaction.explorerUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View validated transaction <ArrowIcon />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-8 grid min-h-44 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center">
                <div>
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <path d="M12 3 5.5 5.6v5.8c0 4.1 2.6 7.8 6.5 9.6 3.9-1.8 6.5-5.5 6.5-9.6V5.6L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-400">Waiting for a proposal</p>
                  <p className="mt-1 text-xs text-slate-600">Budget, permissions and approval rules run next.</p>
                </div>
              </div>
            )}
          </article>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/8 py-5 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>Purchase LARP · SingHacks 2026 Ripple Track</p>
          <p>Testnet only · Secrets remain server-side · SourceTag 20260530</p>
        </footer>
      </div>
    </main>
  );
}

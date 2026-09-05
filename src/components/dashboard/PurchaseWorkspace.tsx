"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/brand";
import { WorkspaceNav } from "./WorkspaceNav";
import { agents, sampleObjectives } from "@/data/product";
import type { MultiAgentPipelineResult } from "@/types";
import {
  purchaseService,
  saveReceipt,
  formatXrp,
  type WalletView,
  type Receipt,
} from "@/services/purchase";
type Phase =
  "idle" | "analyzing" | "review" | "sending" | "confirmed" | "failed";
export function PurchaseWorkspace({
  initialObjective,
}: {
  initialObjective: string;
}) {
  const [objective, setObjective] = useState(initialObjective);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [walletError, setWalletError] = useState("");
  const [walletLoading, setWalletLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<MultiAgentPipelineResult | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const lock = useRef(false);
  async function loadWallet() {
    setWalletLoading(true);
    setWalletError("");
    try {
      setWallet(await purchaseService.wallet());
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Wallet unavailable.");
    } finally {
      setWalletLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    purchaseService
      .wallet()
      .then((w) => {
        if (active) setWallet(w);
      })
      .catch((e) => {
        if (active) setWalletError(e.message);
      })
      .finally(() => {
        if (active) setWalletLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function analyze() {
    if (lock.current || !objective.trim()) return;
    lock.current = true;
    setPhase("analyzing");
    setResult(null);
    setReceipt(null);
    setConfirmed(false);
    setError("");
    setVerified(false);
    try {
      const r = await purchaseService.analyze(objective.trim());
      setResult(r);
      if (!r.proposal) {
        setPhase("failed");
        setError(
          r.catalog.offers.length === 0
            ? "No matching product is in the demo catalog. Try storage, API credits, compute, analytics or a chair."
            : "Your agents found options, but none fit your budget. Increase the budget or change the request.",
        );
      } else if (!r.policyDecision?.approved) {
        setPhase("failed");
        setError(
          "This proposal did not pass the policy check. The rule results below explain why.",
        );
      } else setPhase("review");
    } catch (e) {
      setPhase("failed");
      setError(
        e instanceof Error ? e.message : "Unable to complete the search.",
      );
    } finally {
      lock.current = false;
    }
  }
  async function pay() {
    if (
      lock.current ||
      !confirmed ||
      phase !== "review" ||
      !result?.proposal ||
      !result.policyDecision?.approved
    )
      return;
    lock.current = true;
    setPhase("sending");
    setError("");
    try {
      const tx = await purchaseService.submit(result.proposal);
      const r: Receipt = {
        ...tx,
        objective,
        provider: result.analysis.selectedOffer?.provider ?? "Catalog provider",
        amount: result.proposal.amount,
      };
      setReceipt(r);
      const stored = saveReceipt(r);
      if (tx.status !== "confirmed") {
        setPhase("failed");
        setError(
          tx.error ||
            "The payment was not confirmed. Check the receipt before trying again.",
        );
      } else {
        setPhase("confirmed");
        if (!stored)
          setError(
            "Payment confirmed, but browser storage is unavailable. Save the transaction hash below.",
          );
        if (tx.hash) {
          try {
            const check = await purchaseService.verify(tx.hash);
            setVerified(check.status === "confirmed");
          } catch {
            /* Keep the submission receipt when a second query is unavailable. */
          }
        }
        void loadWallet();
      }
    } catch (e) {
      setPhase("failed");
      setError(
        (e instanceof Error ? e.message : "The response was interrupted.") +
          " If the request reached the ledger, it may still settle. Check the wallet or explorer before starting another payment.",
      );
    } finally {
      lock.current = false;
    }
  }
  const busy = phase === "analyzing" || phase === "sending";
  const current =
    phase === "idle"
      ? 0
      : phase === "analyzing"
        ? 1
        : phase === "review"
          ? 2
          : phase === "sending"
            ? 3
            : phase === "confirmed"
              ? 4
              : result?.proposal
                ? 2
                : 1;
  return (
    <main id="main" className="wrap page-main">
      <WorkspaceNav />
      <PageHeader
        eyebrow="YOUR WORKSPACE"
        title="What can we take off your plate?"
        description="Give your team a clear objective. They’ll compare the options and bring a payment proposal back for your review."
      />
      <div className="purchase-progress">
        {[
          "Your objective",
          "Agent research",
          "Your review",
          "XRPL payment",
          "Receipt",
        ].map((s, i) => (
          <div className={i <= current ? "step-active" : ""} key={s}>
            <span>{i < current ? <Check size={12} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <div className="workspace-grid">
        <div>
          <section className="panel">
            <h2>Start with what you need.</h2>
            <p className="panel-subtitle">
              Try a product, the features that matter, and a maximum budget in
              XRP.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void analyze();
              }}
            >
              <label className="field">
                Purchase objective
                <textarea
                  required
                  maxLength={2000}
                  disabled={busy}
                  value={objective}
                  onChange={(e) => {
                    setObjective(e.target.value);
                    setResult(null);
                    setReceipt(null);
                    setPhase("idle");
                    setConfirmed(false);
                    setError("");
                  }}
                  placeholder="Find the best cloud storage under 5 XRP"
                />
              </label>
              <div className="chips">
                {sampleObjectives.map((x) => (
                  <button
                    className="chip"
                    disabled={busy}
                    type="button"
                    key={x.label}
                    onClick={() => {
                      setObjective(x.text);
                      setResult(null);
                      setReceipt(null);
                      setPhase("idle");
                      setConfirmed(false);
                      setError("");
                    }}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <small>No payment is made during research.</small>
                <button
                  className="button button-primary"
                  disabled={busy || !objective.trim()}
                  type="submit"
                >
                  {phase === "analyzing" ? (
                    <>
                      <LoaderCircle size={17} className="spin" />
                      Researching…
                    </>
                  ) : (
                    <>
                      Find my best option
                      <ArrowUpRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
            {phase === "analyzing" && (
              <div className="live-stage" role="status">
                <LoaderCircle className="spin" size={22} />
                <div>
                  <strong>Your team is researching.</strong>
                  <p>
                    Scout and Analyst are comparing the catalog. This can take
                    15–45 seconds. Their decision summaries will appear here.
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
                {error.includes("sign in") && (
                  <Link href="/login"> Sign in again →</Link>
                )}
              </div>
            )}
          </section>
          {result && (
            <section className="panel" style={{ marginTop: 24 }}>
              <h2>Your team’s findings</h2>
              <p className="panel-subtitle">
                A clear record of what each specialist decided.
              </p>
              <ol className="trace-list">
                {result.trace.map((t, i) => (
                  <li key={t.id}>
                    <span className="trace-step">{i + 1}</span>
                    <div className="trace-content">
                      <div>
                        <strong>{t.label}</strong>
                        <span className={"tag engine-" + t.engine}>
                          {t.engine === "gemini"
                            ? "Gemini"
                            : t.engine === "policy"
                              ? "Policy rules"
                              : "Deterministic"}
                        </span>
                      </div>
                      <p>{t.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {result.catalog.offers.length > 0 && (
                <>
                  <h3>Compared for you</h3>
                  <div className="quote-list">
                    {result.catalog.offers.map((o) => {
                      const selected =
                        result.analysis.selectedOffer?.id === o.id;
                      const evaluation = result.analysis.evaluations.find(
                        (x) => x.offerId === o.id,
                      );
                      return (
                        <div
                          key={o.id}
                          className={
                            "quote " + (selected ? "quote-selected" : "")
                          }
                        >
                          <div className="quote-top">
                            <strong>
                              {o.provider} · {o.service}
                            </strong>
                            <span>{formatXrp(o.priceXrp)} XRP</span>
                          </div>
                          <p>{o.description}</p>
                          <div className="quote-footer">
                            <span>{o.features.slice(0, 2).join(" · ")}</span>
                            <span>
                              {selected
                                ? "Recommended"
                                : evaluation?.eligible === false
                                  ? "Over budget"
                                  : "Alternative"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {result.policyDecision && (
                <details style={{ marginTop: 25 }}>
                  <summary className="text-link">View policy checks</summary>
                  <div>
                    {result.policyDecision.rulesChecked.map((r) => (
                      <div className="policy-row" key={r.rule}>
                        <div>
                          <span>{r.rule}</span>
                          <small>{r.message}</small>
                        </div>
                        <span
                          className={
                            r.passed ? "status-success" : "status-failed"
                          }
                        >
                          {r.passed ? "Passed" : "Denied"}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}
          {result?.proposal && result.policyDecision?.approved && !receipt && (
            <section className="panel review-panel">
              <div className="panel-heading">
                <span>
                  <ShieldCheck size={18} />
                  Review your payment
                </span>
                <span className="tag">XRPL TESTNET</span>
              </div>
              <div className="review-amount">
                {formatXrp(result.proposal.amount)}
                <small> XRP</small>
              </div>
              <dl className="review-details">
                <dt>Provider</dt>
                <dd>{result.analysis.selectedOffer?.provider}</dd>
                <dt>Recipient</dt>
                <dd>{result.proposal.recipient}</dd>
                <dt>Purpose</dt>
                <dd>{result.proposal.reason}</dd>
                <dt>Network fee</dt>
                <dd>Calculated by XRPL when the transaction is prepared.</dd>
              </dl>
              <label className="review-check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy || phase === "failed"}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I have reviewed this recipient and amount. I authorize this
                  Testnet payment from the shared demo wallet.
                </span>
              </label>
              <button
                className="button button-primary full-width"
                disabled={!confirmed || phase !== "review" || !wallet?.isFunded}
                onClick={() => void pay()}
              >
                {phase === "sending" ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Waiting for ledger confirmation…
                  </>
                ) : (
                  <>
                    Approve & pay {formatXrp(result.proposal.amount)} XRP
                    <ArrowUpRight size={17} />
                  </>
                )}
              </button>
              <p className="notice-inline">
                Demo products are illustrative. This payment does not deliver a
                physical item or activate a real subscription.
              </p>
            </section>
          )}
          {receipt && (
            <section
              className={
                "panel review-panel " +
                (receipt.status === "confirmed" ? "result-success" : "")
              }
              aria-live="polite"
            >
              <CheckCircle2 size={32} />
              <h2>
                {receipt.status === "confirmed"
                  ? "Payment confirmed."
                  : "Payment needs attention."}
              </h2>
              <p className="panel-subtitle">
                {verified
                  ? "Verified independently on XRPL Testnet."
                  : "Your settlement result is recorded below."}
              </p>
              <dl className="review-details">
                <dt>Amount</dt>
                <dd>{formatXrp(receipt.amount)} XRP</dd>
                <dt>Provider</dt>
                <dd>{receipt.provider}</dd>
                <dt>Transaction</dt>
                <dd>{receipt.hash ?? "No hash returned"}</dd>
                <dt>Ledger</dt>
                <dd>{receipt.ledgerIndex ?? "Not yet available"}</dd>
              </dl>
              <div className="receipt-actions">
                {receipt.hash && (
                  <a
                    className="button button-ghost"
                    href={
                      "https://testnet.xrpl.org/transactions/" +
                      encodeURIComponent(receipt.hash)
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on explorer
                    <ArrowUpRight size={16} />
                  </a>
                )}
                <Link className="button button-primary" href="/activity">
                  Your activity
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </section>
          )}
        </div>
        <aside className="side-stack">
          <section className="panel wallet-panel">
            <div className="panel-heading">
              <span>
                <Wallet size={18} />
                Demo wallet
              </span>
              <button
                className="icon-button"
                disabled={walletLoading}
                aria-label="Refresh wallet"
                onClick={() => void loadWallet()}
              >
                <RefreshCw size={14} className={walletLoading ? "spin" : ""} />
              </button>
            </div>
            {wallet ? (
              <>
                <div className="wallet-amount">
                  {formatXrp(wallet.balanceXrp)}
                  <small> XRP</small>
                </div>
                <div className="wallet-facts">
                  <span>{formatXrp(wallet.spendableXrp)} available</span>
                  <span>{formatXrp(wallet.reservedXrp)} reserved</span>
                </div>
                <div className="wallet-address">
                  <span>
                    {wallet.address.slice(0, 12)}…{wallet.address.slice(-8)}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Copy wallet address"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(wallet.address);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setWalletError(
                          "Clipboard unavailable. Wallet: " + wallet.address,
                        );
                      }
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </>
            ) : (
              <p className="panel-subtitle" role="status">
                {walletLoading ? "Connecting to XRPL Testnet…" : walletError}
              </p>
            )}
            {wallet && walletError && (
              <p className="notice-inline">{walletError}</p>
            )}
            <p className="notice-inline">
              Shared Testnet wallet · Test XRP only.
            </p>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <span>
                <Sparkles size={18} />
                Your specialist team
              </span>
            </div>
            <ul className="team-list">
              {agents.map((a) => (
                <li key={a.id}>
                  <span className={"agent-avatar avatar-" + a.id}>
                    {a.initials}
                  </span>
                  <div>
                    <strong>{a.name}</strong>
                    <small>{a.role}</small>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              className="text-link"
              style={{ marginTop: 25 }}
              href="/dashboard/agents"
            >
              How your team works
              <ArrowUpRight size={15} />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

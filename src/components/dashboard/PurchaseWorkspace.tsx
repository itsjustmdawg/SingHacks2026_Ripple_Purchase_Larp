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
import { PriceFields } from "@/components/shopping/PriceFields";
import { BudgetPreview } from "@/components/shopping/BudgetPreview";
import { WebResults } from "@/components/shopping/WebResults";
import type {
  PriceBudget,
  WebSearchResult,
  SearchMode,
  ShoppingResult,
} from "@/types/shopping";
import { paymentRecovery } from "@/services/recovery";
import {
  api,
  RequestError,
  clearPendingPayment,
  savePendingPayment,
  getPendingPayment,
} from "@/services/purchase";
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
  | "idle"
  | "analyzing"
  | "review"
  | "sending"
  | "confirmed"
  | "failed"
  | "researched";
export function PurchaseWorkspace({
  initialObjective,
  initialPricing = "",
  initialMode = "web",
}: {
  initialObjective: string;
  initialPricing?: string;
  initialMode?: SearchMode;
}) {
  const [objective, setObjective] = useState(initialObjective);
  const [pricing, setPricing] = useState(initialPricing);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [budget, setBudget] = useState<PriceBudget | null>(null);
  const [web, setWeb] = useState<WebSearchResult | null>(null);
  const [nextStep, setNextStep] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
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
    const sync = () => {
      const pending = getPendingPayment();
      if (pending) {
        setReceipt(pending);
        setUncertain(true);
        setError(
          "A previous payment needs verification before another one can be sent.",
        );
        setNextStep(
          "Check its status or inspect wallet activity. Do not resend it blindly.",
        );
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (mode !== "demo") return;
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
  }, [mode]);
  function resetSearch() {
    setResult(null);
    setWeb(null);
    setBudget(null);
    if (!uncertain) {
      setReceipt(null);
      setError("");
      setNextStep("");
    }
    setConfirmed(false);
    setVerified(false);
    setPhase("idle");
  }
  async function checkPayment() {
    if (!receipt?.hash || checking) return;
    setChecking(true);
    try {
      const checked = await purchaseService.verify(receipt.hash);
      const updated = {
        ...receipt,
        ...checked,
        transactionId: receipt.transactionId,
        proposalId: receipt.proposalId,
      };
      setReceipt(updated);
      saveReceipt(updated);
      if (checked.status === "confirmed") {
        setPhase("confirmed");
        setVerified(true);
        setUncertain(false);
        clearPendingPayment();
        setError("");
        setNextStep("");
        void loadWallet();
      } else if (checked.status === "failed" && checked.ledgerIndex !== null) {
        setUncertain(false);
        clearPendingPayment();
        setError(checked.error || "The ledger confirmed this payment failed.");
        setNextStep(
          "The network fee may have been charged. Fix the cause and research again for a fresh proposal.",
        );
      } else {
        setError(checked.error || "The result is still uncertain.");
        setNextStep(
          "Retry this status check later. It only reads the ledger and will never send another payment.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status check unavailable.");
      setNextStep(
        "Retry the status check, or use the explorer link. Do not submit another payment yet.",
      );
    } finally {
      setChecking(false);
    }
  }
  async function analyze() {
    if (lock.current || !objective.trim() || !pricing.trim()) return;
    lock.current = true;
    setPhase("analyzing");
    setResult(null);
    if (!uncertain) setReceipt(null);
    setWeb(null);
    setBudget(null);
    setNextStep("");
    setConfirmed(false);
    setError("");
    setVerified(false);
    try {
      const prepared = await api<{ budget: PriceBudget; token: string }>(
        "/api/shopping/prepare",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item: objective.trim(),
            pricing: pricing.trim(),
            mode,
          }),
        },
      );
      setBudget(prepared.budget);
      const data = await api<ShoppingResult>("/api/shopping/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: prepared.token }),
      });
      if (data.web) {
        setBudget(data.budget);
        setWeb(data.web);
        setPhase("researched");
        return;
      }
      const r = data.demo;
      if (!r)
        throw new Error(
          "The search returned an incomplete result. Retry research.",
        );
      setResult(r);
      if (!r.proposal) {
        setPhase("failed");
        setError(
          r.catalog.offers.length === 0
            ? "This item is not in the fixed Testnet demo catalog. Switch to Web search to research any product category."
            : "No demo offer fits your complete price range. Adjust the minimum or maximum, or switch to Web search.",
        );
      } else if (!r.policyDecision?.approved) {
        setPhase("failed");
        setError(
          "This proposal did not pass the policy check. The rule results below explain why.",
        );
      } else setPhase("review");
      if (!r.proposal)
        setNextStep(
          "Choose Web search for real listings, or edit the item and price fields, then retry.",
        );
      else if (!r.policyDecision?.approved)
        setNextStep(
          "Read the policy checks below. The shared demo has separate spending limits; changing currency does not override them. Adjust the request and research again.",
        );
    } catch (e) {
      setPhase("failed");
      setError(
        e instanceof Error ? e.message : "Unable to complete the search.",
      );
      setNextStep(
        e instanceof RequestError
          ? e.nextStep
          : "Retry research, or edit the item and price. No payment was sent.",
      );
    } finally {
      lock.current = false;
    }
  }
  async function pay() {
    if (
      lock.current ||
      uncertain ||
      mode !== "demo" ||
      !wallet?.isFunded ||
      !confirmed ||
      phase !== "review" ||
      !result?.proposal ||
      !result.policyDecision?.approved
    )
      return;
    const pending: Receipt = {
      transactionId: "attempt:" + result.proposal.id,
      proposalId: result.proposal.id,
      status: "pending",
      hash: null,
      ledgerIndex: null,
      explorerUrl: null,
      submittedAt: new Date().toISOString(),
      confirmedAt: null,
      error: null,
      objective,
      provider: result.analysis.selectedOffer?.provider ?? "Demo provider",
      amount: result.proposal.amount,
      walletAddress: wallet.address,
    };
    if (!savePendingPayment(pending)) {
      setError(
        "Browser storage is unavailable, so we cannot safely track an interrupted payment.",
      );
      setNextStep(
        "Enable site storage, refresh, and review the proposal again. No payment was sent.",
      );
      return;
    }
    lock.current = true;
    setPhase("sending");
    setError("");
    try {
      const tx = await purchaseService.submit(result.proposal);
      const r: Receipt = {
        ...tx,
        walletAddress: wallet.address,
        objective,
        provider: result.analysis.selectedOffer?.provider ?? "Catalog provider",
        amount: result.proposal.amount,
      };
      setReceipt(r);
      const stored = saveReceipt(r);
      if (
        tx.status === "confirmed" ||
        (!tx.hash && !tx.submittedAt) ||
        (tx.status === "failed" && tx.ledgerIndex !== null)
      ) {
        clearPendingPayment();
        setUncertain(false);
      } else {
        savePendingPayment(r);
        setUncertain(true);
      }
      setNextStep(
        tx.hash
          ? "Check payment status below. A status retry only reads the ledger."
          : "No transaction was submitted. Fix the reported balance, destination or connection problem, refresh the wallet, then research and review again.",
      );
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
      const safe =
        e instanceof RequestError && [400, 401, 403].includes(e.status);
      if (safe) {
        clearPendingPayment();
        setUncertain(false);
      } else {
        setUncertain(true);
        setReceipt(pending);
      }
      setNextStep(
        safe
          ? "Sign in if needed, then research and review a fresh proposal."
          : "Open wallet activity or the explorer first. A lost response does not mean the transaction failed; do not pay again until checked.",
      );
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
  const recovery = paymentRecovery(receipt, uncertain);
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
        description="Tell us what you need and your price range in your currency. Research the web, or explicitly choose the Testnet payment demo."
      />
      <div className="purchase-progress">
        {(mode === "web"
          ? ["Item & price", "Web research", "Compare & visit seller"]
          : [
              "Your objective",
              "Agent research",
              "Your review",
              "XRPL payment",
              "Receipt",
            ]
        ).map((s, i) => (
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
              Two fields. Any product category. Your price range stays separate
              from your item requirements.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void analyze();
              }}
            >
              <fieldset className="search-mode" disabled={busy}>
                <legend>Where should your agents search?</legend>
                {(["web", "demo"] as const).map((m) => (
                  <label key={m}>
                    <input
                      type="radio"
                      name="search-mode"
                      checked={mode === m}
                      onChange={() => {
                        resetSearch();
                        setMode(m);
                      }}
                    />
                    {m === "web"
                      ? "Web search · real sources"
                      : "Testnet demo · sample catalog"}
                  </label>
                ))}
              </fieldset>
              <PriceFields
                item={objective}
                pricing={pricing}
                disabled={busy}
                onItem={(value) => {
                  resetSearch();
                  setObjective(value);
                }}
                onPricing={(value) => {
                  resetSearch();
                  setPricing(value);
                }}
              />
              <div className="chips">
                {sampleObjectives.map((x) => (
                  <button
                    className="chip"
                    disabled={busy}
                    type="button"
                    key={x.label}
                    onClick={() => {
                      resetSearch();
                      setObjective(x.text.replace(/\s+under.*$/i, ""));
                      setPricing("max 5 XRP");
                      setMode("demo");
                    }}
                  >
                    Demo: {x.label}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <small>No payment is made during research.</small>
                <button
                  className="button button-primary"
                  disabled={busy || !objective.trim() || !pricing.trim()}
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
            {budget && <BudgetPreview budget={budget} />}
            {phase === "analyzing" && (
              <div className="live-stage" role="status">
                <LoaderCircle className="spin" size={22} />
                <div>
                  <strong>Your team is researching.</strong>
                  <p>
                    {budget
                      ? "Scout is gathering sources and Analyst is comparing prices. This may take up to 50 seconds."
                      : "Interpreting your price and checking currency rates…"}{" "}
                    No payment is being sent.
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
                {nextStep && (
                  <p className="recovery-next">
                    <strong>What to do next:</strong> {nextStep}
                  </p>
                )}
                {mode === "web" && (
                  <p>
                    <a
                      className="text-link"
                      href={
                        "https://www.google.com/search?tbm=shop&q=" +
                        encodeURIComponent(objective + " " + pricing)
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open this query in Google Shopping ↗
                    </a>
                    <small className="notice-inline">
                      {" "}
                      Opens an external search, not an agent-generated result.
                    </small>
                  </p>
                )}
                {uncertain && (receipt?.walletAddress || wallet?.address) && (
                  <p>
                    <a
                      className="text-link"
                      href={
                        "https://testnet.xrpl.org/accounts/" +
                        encodeURIComponent(
                          receipt?.walletAddress || wallet?.address || "",
                        )
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Inspect this wallet’s ledger activity ↗
                    </a>
                  </p>
                )}
                <div className="recovery-actions">
                  {recovery === "verify" && receipt?.hash ? (
                    <button
                      className="button button-ghost"
                      disabled={checking || busy}
                      onClick={() => void checkPayment()}
                    >
                      <RefreshCw size={15} />
                      {checking ? "Checking…" : "Retry payment status check"}
                    </button>
                  ) : (
                    !uncertain && (
                      <button
                        className="button button-ghost"
                        disabled={busy}
                        onClick={() => void analyze()}
                      >
                        <RefreshCw size={15} />
                        Retry research · no payment
                      </button>
                    )
                  )}
                  <button
                    className="button button-ghost"
                    disabled={busy}
                    onClick={() =>
                      document.getElementById("shopping-price")?.focus()
                    }
                  >
                    Edit price / request
                  </button>
                  {mode === "demo" && !uncertain && (
                    <button
                      className="button button-ghost"
                      disabled={busy}
                      onClick={() => {
                        resetSearch();
                        setMode("web");
                      }}
                    >
                      Switch to web search
                    </button>
                  )}
                  {uncertain && !receipt?.hash && (
                    <>
                      <Link className="button button-ghost" href="/activity">
                        Inspect wallet / transaction activity
                      </Link>
                      <button
                        className="button button-ghost"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Only continue if you have checked the wallet’s ledger activity and confirmed the previous payment will not be duplicated. Have you checked?",
                            )
                          ) {
                            clearPendingPayment();
                            setUncertain(false);
                            setReceipt(null);
                            setResult(null);
                            setPhase("idle");
                            setError("");
                            setNextStep("");
                          }
                        }}
                      >
                        I checked the ledger — resume
                      </button>
                    </>
                  )}
                </div>
                {error.includes("sign in") && (
                  <Link href="/login"> Sign in again →</Link>
                )}
              </div>
            )}
          </section>
          {web && (
            <WebResults
              result={web}
              retry={() => void analyze()}
              disabled={busy}
            />
          )}
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
                disabled={
                  uncertain ||
                  !confirmed ||
                  phase !== "review" ||
                  !wallet?.isFunded
                }
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
                {receipt.hash && receipt.status !== "confirmed" && (
                  <button
                    className="button button-ghost"
                    disabled={checking || busy}
                    onClick={() => void checkPayment()}
                  >
                    {checking ? "Checking…" : "Retry status check"}
                  </button>
                )}
                {receipt.status === "failed" && !uncertain && (
                  <button
                    className="button button-ghost"
                    disabled={busy}
                    onClick={() => void analyze()}
                  >
                    Research & review a new attempt
                  </button>
                )}
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
          {mode === "demo" && (
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
                  <RefreshCw
                    size={14}
                    className={walletLoading ? "spin" : ""}
                  />
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
              {walletError && (
                <div className="recovery-actions">
                  <p className="notice-inline">
                    Check your connection and retry. If the faucet or ledger is
                    busy, wait a moment. No payment is sent by this check.
                  </p>
                  <button
                    className="button button-ghost"
                    disabled={walletLoading}
                    onClick={() => void loadWallet()}
                  >
                    Retry wallet connection
                  </button>
                </div>
              )}
              <p className="notice-inline">
                Shared Testnet wallet · Test XRP only.
              </p>
            </section>
          )}
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

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  LoaderCircle,
  Lock,
  RefreshCw,
  ShieldAlert,
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
  type EscrowTransactionResult,
  type VendorDeliveryReceipt,
} from "@/services/purchase";

type Phase =
  | "idle"
  | "analyzing"
  | "review"
  | "sending"
  | "confirmed"
  | "failed";

type SettlementMode = "escrow" | "direct";

type EscrowPhase =
  | "none"
  | "locking"
  | "locked"
  | "delivering"
  | "delivered"
  | "releasing"
  | "finished"
  | "cancelling"
  | "cancelled";

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

  // Escrow & Digital Safe state
  const [settlementMode, setSettlementMode] = useState<SettlementMode>("escrow");
  const [pitchSeconds, setPitchSeconds] = useState<number>(30);
  const [escrowPhase, setEscrowPhase] = useState<EscrowPhase>("none");
  const [escrowResult, setEscrowResult] = useState<EscrowTransactionResult | null>(null);
  const [deliveryReceipt, setDeliveryReceipt] = useState<VendorDeliveryReceipt | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const lock = useRef(false);

  useEffect(() => {
    if (
      secondsRemaining === null ||
      secondsRemaining <= 0 ||
      escrowPhase === "finished" ||
      escrowPhase === "cancelled"
    )
      return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining, escrowPhase]);

  // When safe expires (secondsRemaining reaches 0), automatically execute refund on XRPL if not yet released
  useEffect(() => {
    if (
      secondsRemaining === 0 &&
      result?.proposal &&
      escrowResult?.escrowSequence &&
      (escrowPhase === "locked" || escrowPhase === "delivered") &&
      !lock.current
    ) {
      void cancelEscrow(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining, result?.proposal, escrowResult?.escrowSequence, escrowPhase]);

  function resetPlan(newObjective?: string) {
    if (typeof newObjective === "string") setObjective(newObjective);
    setResult(null);
    setReceipt(null);
    setPhase("idle");
    setConfirmed(false);
    setError("");
    setEscrowPhase("none");
    setEscrowResult(null);
    setDeliveryReceipt(null);
    setSecondsRemaining(null);
  }

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
    resetPlan();
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

  async function payDirect() {
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

  async function lockEscrow() {
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
    setEscrowPhase("locking");
    setEscrowResult(null);
    setDeliveryReceipt(null);
    setError("");

    try {
      const res = await purchaseService.lockEscrow(
        result.proposal,
        pitchSeconds,
      );
      setEscrowResult(res);
      setEscrowPhase("delivering");
      setSecondsRemaining(pitchSeconds);
      setPhase("review");
      void loadWallet();

      // Automatically simulate provider delivery
      try {
        const dReceipt = await purchaseService.deliver(
          result.proposal.id,
          false,
        );
        setDeliveryReceipt(dReceipt);
        setEscrowPhase("delivered");
      } catch {
        setEscrowPhase("locked");
      }
    } catch (e) {
      setPhase("failed");
      setEscrowPhase("none");
      setError(
        e instanceof Error ? e.message : "Unable to lock escrow safe on XRPL.",
      );
    } finally {
      lock.current = false;
    }
  }

  async function releaseEscrow() {
    if (lock.current || !result?.proposal || !escrowResult?.escrowSequence) return;
    lock.current = true;
    setEscrowPhase("releasing");
    setError("");

    try {
      const res = await purchaseService.releaseEscrow(
        result.proposal.id,
        escrowResult.escrowSequence,
        `Service verified: ${deliveryReceipt?.credentialId ?? result.proposal.id}`,
      );
      setEscrowResult(res);
      setEscrowPhase("finished");
      setPhase("confirmed");

      const r: Receipt = {
        ...res,
        objective,
        provider: result.analysis.selectedOffer?.provider ?? "Catalog provider",
        amount: result.proposal.amount,
      };
      setReceipt(r);
      saveReceipt(r);
      void loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to release escrow payment.");
      setEscrowPhase("delivered");
    } finally {
      lock.current = false;
    }
  }

  async function cancelEscrow(simulateGhosting = false) {
    if (lock.current || !result?.proposal || !escrowResult?.escrowSequence) return;

    if (simulateGhosting && secondsRemaining !== null && secondsRemaining > 5) {
      setDeliveryReceipt({
        credentialId: `sim-fail-${Date.now()}`,
        accessKey: "",
        serviceEndpoint: "https://offline-vendor.mock/timeout",
        deliveredAt: new Date().toISOString(),
        status: "failed",
        details: `Simulated seller dropout: Vendor endpoint unreachable. Automatic refund will execute on XRPL in ${secondsRemaining}s once the lock window expires.`,
      });
      setEscrowPhase("locked");
      return;
    }

    lock.current = true;
    setEscrowPhase("cancelling");
    setError("");

    if (simulateGhosting || (!deliveryReceipt || deliveryReceipt.status !== "delivered")) {
      setDeliveryReceipt((prev) => ({
        credentialId: prev?.credentialId ?? `timeout-${Date.now()}`,
        accessKey: "",
        serviceEndpoint: prev?.serviceEndpoint ?? "https://offline-vendor.mock/timeout",
        deliveredAt: new Date().toISOString(),
        status: "failed",
        details:
          "Escrow safe expired: Automatic refund guarantee executed on XRPL.",
      }));
    }

    try {
      const res = await purchaseService.cancelEscrow(
        result.proposal.id,
        escrowResult.escrowSequence,
        "Cancellation & refund: delivery timeout or non-delivery.",
      );
      setEscrowResult(res);
      setEscrowPhase("cancelled");
      setPhase("confirmed");

      const r: Receipt = {
        ...res,
        objective,
        provider: result.analysis.selectedOffer?.provider ?? "Catalog provider",
        amount: result.proposal.amount,
      };
      setReceipt(r);
      saveReceipt(r);
      void loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel escrow on XRPL.");
      setEscrowPhase("locked");
    } finally {
      lock.current = false;
    }
  }

  function handlePay() {
    if (settlementMode === "escrow") {
      void lockEscrow();
    } else {
      void payDirect();
    }
  }

  const busy =
    phase === "analyzing" ||
    phase === "sending" ||
    escrowPhase === "locking" ||
    escrowPhase === "releasing" ||
    escrowPhase === "cancelling";

  const isSettled =
    phase === "confirmed" ||
    escrowPhase === "finished" ||
    escrowPhase === "cancelled";

  const current =
    phase === "idle"
      ? 0
      : phase === "analyzing"
        ? 1
        : phase === "review" && escrowPhase === "none"
          ? 2
          : phase === "sending" || (escrowPhase !== "none" && !isSettled)
            ? 3
            : isSettled
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
          settlementMode === "escrow" ? "Digital Safe" : "XRPL payment",
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
                  onChange={(e) => resetPlan(e.target.value)}
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
                    onClick={() => resetPlan(x.text)}
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
          {/* Review & Settlement Configuration Panel */}
          {result?.proposal && result.policyDecision?.approved && !receipt && (
            <section className="panel review-panel">
              <div className="panel-heading">
                <span>
                  <ShieldCheck size={18} />
                  Review & Authorization
                </span>
                <span className="tag">XRPL TESTNET</span>
              </div>
              <div className="review-amount">
                {formatXrp(result.proposal.amount)}
                <small> XRP</small>
              </div>

              {/* Settlement Mode Selection */}
              {escrowPhase === "none" && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      margin: "20px 0 16px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSettlementMode("escrow")}
                      className={
                        "quote " +
                        (settlementMode === "escrow" ? "quote-selected" : "")
                      }
                      style={{ textAlign: "left", cursor: "pointer" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Lock size={14} color="var(--amber)" /> Digital Safe
                        </strong>
                        <span
                          className="tag"
                          style={{
                            color: "var(--green)",
                            borderColor: "rgba(140,211,176,0.3)",
                            fontSize: 9,
                          }}
                        >
                          PROTECTED
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          margin: "8px 0 0",
                        }}
                      >
                        Locked on XRPL. Auto-refunds if seller ghosts or
                        delivery fails.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettlementMode("direct")}
                      className={
                        "quote " +
                        (settlementMode === "direct" ? "quote-selected" : "")
                      }
                      style={{ textAlign: "left", cursor: "pointer" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <ArrowUpRight size={14} /> Direct Payment
                        </strong>
                        <span className="tag" style={{ fontSize: 9 }}>
                          INSTANT
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          margin: "8px 0 0",
                        }}
                      >
                        Standard transfer. Settle immediately to provider on
                        confirmation.
                      </p>
                    </button>
                  </div>

                  {/* 30-Second Pitch Demo Toggle */}
                  {settlementMode === "escrow" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#ffffff04",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        marginBottom: 20,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "var(--muted)" }}>
                        Auto-Refund Guarantee Window:
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          style={{
                            background:
                              pitchSeconds === 30 ? "#ff5a1f25" : "transparent",
                            border: `1px solid ${
                              pitchSeconds === 30
                                ? "var(--orange)"
                                : "var(--line)"
                            }`,
                            color:
                              pitchSeconds === 30
                                ? "var(--amber)"
                                : "var(--dim)",
                            padding: "4px 10px",
                            fontSize: 11,
                            borderRadius: 6,
                          }}
                          onClick={() => setPitchSeconds(30)}
                        >
                          30s (Pitch Demo)
                        </button>
                        <button
                          type="button"
                          style={{
                            background:
                              pitchSeconds === 300
                                ? "#ff5a1f25"
                                : "transparent",
                            border: `1px solid ${
                              pitchSeconds === 300
                                ? "var(--orange)"
                                : "var(--line)"
                            }`,
                            color:
                              pitchSeconds === 300
                                ? "var(--amber)"
                                : "var(--dim)",
                            padding: "4px 10px",
                            fontSize: 11,
                            borderRadius: 6,
                          }}
                          onClick={() => setPitchSeconds(300)}
                        >
                          5m (Standard)
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <dl className="review-details">
                <dt>Provider</dt>
                <dd>{result.analysis.selectedOffer?.provider}</dd>
                <dt>Recipient</dt>
                <dd>{result.proposal.recipient}</dd>
                <dt>Purpose</dt>
                <dd>{result.proposal.reason}</dd>
                <dt>Settlement</dt>
                <dd>
                  {settlementMode === "escrow"
                    ? `Native XRPL Escrow Safe (${pitchSeconds}s refund guarantee)`
                    : "Direct XRPL Payment"}
                </dd>
              </dl>

              {/* Escrow Locking Live Stage */}
              {escrowPhase === "locking" && (
                <div
                  className="live-stage"
                  role="status"
                  style={{ margin: "16px 0 24px" }}
                >
                  <LoaderCircle className="spin" size={24} />
                  <div>
                    <strong>Locking funds in XRPL Digital Safe…</strong>
                    <p>
                      Broadcasting native EscrowCreate to XRPL Testnet with
                      on-chain audit memo.
                    </p>
                  </div>
                </div>
              )}

              {/* Active Escrow Lock Card */}
              {(escrowPhase === "locked" ||
                escrowPhase === "delivering" ||
                escrowPhase === "delivered" ||
                escrowPhase === "releasing" ||
                escrowPhase === "cancelling") && (
                <div
                  style={{
                    padding: 18,
                    background: "rgba(255, 177, 90, 0.06)",
                    border: "1px solid rgba(255, 177, 90, 0.3)",
                    borderRadius: 10,
                    margin: "16px 0 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "rgba(255, 177, 90, 0.15)",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--amber)",
                        }}
                      >
                        <Lock size={18} />
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <strong style={{ fontSize: 13, color: "var(--text)" }}>
                            Funds Locked in XRPL Digital Safe
                          </strong>
                          {escrowResult?.escrowSequence && (
                            <span
                              className="tag"
                              style={{
                                fontSize: 10,
                                color: "var(--amber)",
                                borderColor: "rgba(255, 177, 90, 0.4)",
                              }}
                            >
                              #{escrowResult.escrowSequence}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            margin: "4px 0 0",
                          }}
                        >
                          Locked:{" "}
                          <strong style={{ color: "var(--amber)" }}>
                            {formatXrp(result?.proposal?.amount)} XRP
                          </strong>{" "}
                          · Unspendable by seller until verified
                        </p>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "var(--dim)",
                        }}
                      >
                        Auto-refund in
                      </span>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          fontFamily: "monospace",
                          color:
                            secondsRemaining === 0 || escrowPhase === "cancelling"
                              ? "var(--orange)"
                              : "var(--amber)",
                        }}
                      >
                        {escrowPhase === "cancelling"
                          ? "Refunding…"
                          : secondsRemaining !== null
                            ? `${secondsRemaining}s`
                            : "—"}
                      </div>
                    </div>
                  </div>

                  {escrowResult?.hash && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        marginTop: 14,
                        paddingTop: 10,
                        fontSize: 11,
                        color: "var(--dim)",
                      }}
                    >
                      <span>
                        Ledger: {escrowResult.ledgerIndex ?? "Validated"}
                      </span>
                      <a
                        href={
                          "https://testnet.xrpl.org/transactions/" +
                          encodeURIComponent(escrowResult.hash)
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                        style={{ color: "var(--amber)", fontSize: 11 }}
                      >
                        Safe Create Tx: {escrowResult.hash.slice(0, 10)}…
                        {escrowResult.hash.slice(-6)}
                        <ArrowUpRight size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Handshake Verification Card */}
              {(escrowPhase === "delivered" ||
                escrowPhase === "delivering" ||
                escrowPhase === "locked" ||
                escrowPhase === "releasing" ||
                escrowPhase === "cancelling") &&
                deliveryReceipt && (
                  <div
                    style={{
                      padding: 18,
                      background:
                        deliveryReceipt.status === "failed"
                          ? "rgba(255, 90, 31, 0.08)"
                          : "rgba(140, 211, 176, 0.08)",
                      border: `1px solid ${
                        deliveryReceipt.status === "failed"
                          ? "rgba(255, 90, 31, 0.3)"
                          : "rgba(140, 211, 176, 0.3)"
                      }`,
                      borderRadius: 10,
                      margin: "0 0 24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color:
                            deliveryReceipt.status === "failed"
                              ? "var(--orange)"
                              : "var(--green)",
                        }}
                      >
                        {deliveryReceipt.status === "failed"
                          ? "Seller Delivery Failed"
                          : "Service Delivery Handshake Verified"}
                      </strong>
                      <span
                        className="tag"
                        style={{
                          fontSize: 9,
                          color:
                            deliveryReceipt.status === "failed"
                              ? "var(--orange)"
                              : "var(--green)",
                          borderColor: "currentColor",
                        }}
                      >
                        {deliveryReceipt.status === "failed"
                          ? "OFFLINE / GHOSTED"
                          : "CREDENTIALS READY"}
                      </span>
                    </div>

                    {deliveryReceipt.status === "delivered" ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          background: "rgba(0,0,0,0.25)",
                          borderRadius: 8,
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: "var(--muted)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          Token:{" "}
                          <span style={{ color: "var(--text)" }}>
                            {deliveryReceipt.accessKey}
                          </span>
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          Endpoint:{" "}
                          <span style={{ color: "var(--text)" }}>
                            {deliveryReceipt.serviceEndpoint}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginTop: 8,
                        }}
                      >
                        {deliveryReceipt.details}
                      </p>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginTop: 16,
                      }}
                    >
                      <button
                        type="button"
                        className="button button-primary"
                        style={{
                          background: "var(--green)",
                          color: "#0a0b0d",
                          minHeight: 44,
                          fontSize: 12,
                          gap: 8,
                        }}
                        disabled={busy}
                        onClick={() => void releaseEscrow()}
                      >
                        {escrowPhase === "releasing" ? (
                          <>
                            <LoaderCircle size={15} className="spin" />
                            Releasing on XRPL…
                          </>
                        ) : (
                          <>
                            <Check size={15} />
                            Release Payment
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="button button-ghost"
                        style={{
                          borderColor: "rgba(255, 90, 31, 0.4)",
                          color: "var(--orange)",
                          minHeight: 44,
                          fontSize: 12,
                          gap: 8,
                        }}
                        disabled={busy}
                        onClick={() => void cancelEscrow(true)}
                      >
                        {escrowPhase === "cancelling" ? (
                          <>
                            <LoaderCircle size={15} className="spin" />
                            Refunding on XRPL…
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={15} />
                            Simulate Ghost & Refund
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              {/* Initial Authorization & Locking Checkbox/Button */}
              {escrowPhase === "none" && (
                <>
                  <label className="review-check">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={busy || phase === "failed"}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    <span>
                      {settlementMode === "escrow" ? (
                        <>
                          I authorize locking{" "}
                          <strong style={{ color: "var(--amber)" }}>
                            {formatXrp(result.proposal.amount)} XRP
                          </strong>{" "}
                          into the on-chain XRPL Digital Safe. Funds are released
                          only upon verified delivery, with 100% refund guarantee.
                        </>
                      ) : (
                        <>
                          I have reviewed this recipient and amount. I authorize
                          this direct Testnet payment from the shared demo wallet.
                        </>
                      )}
                    </span>
                  </label>

                  <button
                    className="button button-primary full-width"
                    disabled={
                      !confirmed || phase !== "review" || !wallet?.isFunded
                    }
                    onClick={() => handlePay()}
                  >
                    {phase === "sending" ? (
                      <>
                        <LoaderCircle className="spin" size={17} />
                        {settlementMode === "escrow"
                          ? "Locking in Digital Safe…"
                          : "Waiting for ledger confirmation…"}
                      </>
                    ) : (
                      <>
                        {settlementMode === "escrow" ? (
                          <>
                            <Lock size={17} />
                            Lock in Digital Safe (
                            {formatXrp(result.proposal.amount)} XRP)
                          </>
                        ) : (
                          <>
                            Approve & pay {formatXrp(result.proposal.amount)} XRP
                            <ArrowUpRight size={17} />
                          </>
                        )}
                      </>
                    )}
                  </button>
                </>
              )}

              <p className="notice-inline">
                Testnet demonstration · On-chain SourceTag: 20260530 · Escrow
                rules enforced natively by XRP Ledger consensus.
              </p>
            </section>
          )}

          {/* Final Confirmed Receipt Panel */}
          {receipt && (
            <section
              className={
                "panel review-panel " +
                (receipt.status === "confirmed" ? "result-success" : "")
              }
              aria-live="polite"
            >
              {escrowPhase === "cancelled" ? (
                <ShieldCheck size={32} style={{ color: "var(--amber)" }} />
              ) : (
                <CheckCircle2 size={32} />
              )}
              <h2>
                {escrowPhase === "finished"
                  ? "Digital Safe: Payment Released & Verified."
                  : escrowPhase === "cancelled"
                    ? "Digital Safe: 100% Refunded."
                    : receipt.status === "confirmed"
                      ? "Payment confirmed."
                      : "Payment needs attention."}
              </h2>
              <p className="panel-subtitle">
                {escrowPhase === "finished"
                  ? `Escrow #${escrowResult?.escrowSequence ?? "—"} settled on XRPL Testnet. Service credentials active.`
                  : escrowPhase === "cancelled"
                    ? `Zero counterparty risk. 100% of ${formatXrp(receipt.amount)} XRP restored directly to spendable wallet.`
                    : verified
                      ? "Verified independently on XRPL Testnet."
                      : "Your settlement result is recorded below."}
              </p>
              <dl className="review-details">
                <dt>Amount</dt>
                <dd>
                  {formatXrp(receipt.amount)} XRP
                  {escrowPhase === "cancelled" && " (Refunded to wallet)"}
                </dd>
                <dt>Provider</dt>
                <dd>{receipt.provider}</dd>
                <dt>
                  {escrowPhase === "cancelled"
                    ? "Cancel Tx"
                    : escrowPhase === "finished"
                      ? "Finish Tx"
                      : "Transaction"}
                </dt>
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

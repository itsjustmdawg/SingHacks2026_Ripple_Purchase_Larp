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
import { PriceFields } from "@/components/shopping/PriceFields";
import { BudgetPreview } from "@/components/shopping/BudgetPreview";
import { WebResults } from "@/components/shopping/WebResults";
import type {
  PriceBudget,
  WebSearchResult,
  SearchMode,
  ShoppingResult,
} from "@/types/shopping";
import {
  getEscrowSession,
  saveEscrowSession,
  clearEscrowSession,
} from "@/services/escrow-session";
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
  type EscrowTransactionResult,
  type VendorDeliveryReceipt,
} from "@/services/purchase";

type Phase =
  | "idle"
  | "analyzing"
  | "review"
  | "sending"
  | "confirmed"
  | "failed"
  | "researched";
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

  // Escrow & Digital Safe state
  const [settlementMode, setSettlementMode] =
    useState<SettlementMode>("escrow");
  const [pitchSeconds, setPitchSeconds] = useState<number>(30);
  const [escrowPhase, setEscrowPhase] = useState<EscrowPhase>("none");
  const [escrowResult, setEscrowResult] =
    useState<EscrowTransactionResult | null>(null);
  const [deliveryReceipt, setDeliveryReceipt] =
    useState<VendorDeliveryReceipt | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const lock = useRef(false);

  useEffect(() => {
    const restore = () => {
      const saved = getEscrowSession();
      if (!saved) return;
      setResult(saved.pipeline);
      setObjective(saved.objective);
      setPricing(saved.pricing);
      setMode("demo");
      setSettlementMode("escrow");
      setEscrowResult(saved.escrow);
      setDeliveryReceipt(
        saved.delivery ?? {
          credentialId: "recovered",
          accessKey: "",
          serviceEndpoint: "",
          deliveredAt: new Date().toISOString(),
          status: "failed",
          details:
            "Recovered escrow. Mock delivery has not been verified; cancellation can be requested after its deadline.",
        },
      );
      setPhase("review");
      if (saved.escrow) {
        setEscrowPhase(
          saved.delivery?.status === "delivered" ? "delivered" : "locked",
        );
        setSecondsRemaining(
          saved.escrow.cancelAfterIso
            ? Math.max(
                0,
                Math.ceil(
                  (Date.parse(saved.escrow.cancelAfterIso) - Date.now()) / 1000,
                ),
              )
            : null,
        );
      }
    };
    restore();
  }, []);
  useEffect(() => {
    if (!escrowResult?.cancelAfterIso) return;
    const deadline = Date.parse(escrowResult.cancelAfterIso);
    const tick = () =>
      setSecondsRemaining(
        Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [escrowResult?.cancelAfterIso]);

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
    if (activeEscrow) return;
    setEscrowPhase("none");
    setEscrowResult(null);
    setDeliveryReceipt(null);
    setSecondsRemaining(null);
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
        if (receipt.escrowAction === "create") {
          const escrow = {
            ...updated,
            escrowSequence: checked.escrowSequence ?? receipt.escrowSequence,
          };
          setEscrowResult(escrow);
          setEscrowPhase("locked");
          setPhase("review");
          setReceipt(null);
          setDeliveryReceipt({
            credentialId: "recovered",
            accessKey: "",
            serviceEndpoint: "",
            deliveredAt: new Date().toISOString(),
            status: "failed",
            details:
              "Escrow creation recovered. Delivery is unverified; cancellation remains available after the deadline.",
          });
          if (result)
            saveEscrowSession({
              pipeline: result,
              objective,
              pricing,
              escrow,
              delivery: deliveryReceipt,
            });
        } else {
          setPhase("confirmed");
          if (receipt.escrowAction) {
            setEscrowPhase(
              receipt.escrowAction === "cancel" ? "cancelled" : "finished",
            );
            clearEscrowSession();
          }
        }
        setVerified(true);
        setUncertain(false);
        clearPendingPayment();
        setError("");
        setNextStep("");
        void loadWallet();
      } else if (checked.status === "failed" && checked.ledgerIndex !== null) {
        if (receipt.escrowAction === "create") {
          clearEscrowSession();
          setEscrowPhase("none");
        } else if (receipt.escrowAction) {
          setReceipt(null);
          setEscrowPhase("locked");
          setPhase("review");
        }
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
    if (lock.current || activeEscrow || !objective.trim() || !pricing.trim())
      return;
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

  async function payDirect() {
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

  function escrowAttempt(
    action: "create" | "finish" | "cancel",
  ): Receipt | null {
    if (!result?.proposal || !wallet || uncertain) return null;
    const pending: Receipt = {
      transactionId: "attempt:" + action + ":" + result.proposal.id,
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
      escrowAction: action,
      escrowSequence: escrowResult?.escrowSequence,
    };
    if (
      !saveEscrowSession({
        pipeline: result,
        objective,
        pricing,
        escrow: escrowResult,
        delivery: deliveryReceipt,
      }) ||
      !savePendingPayment(pending)
    ) {
      setError("Enable browser storage before starting a ledger action.");
      setNextStep(
        "No transaction was sent. Storage is needed to recover an interrupted request.",
      );
      return null;
    }
    return pending;
  }
  function escrowError(e: unknown, pending: Receipt) {
    const tx = e instanceof RequestError ? e.transaction : undefined;
    const knownFailure =
      (tx?.status === "failed" && (!tx.hash || tx.ledgerIndex !== null)) ||
      (e instanceof RequestError && [400, 401, 403].includes(e.status));
    setError(
      e instanceof Error ? e.message : "The escrow response was interrupted.",
    );
    setPhase(pending.escrowAction === "create" ? "failed" : "review");
    setEscrowPhase(pending.escrowAction === "create" ? "none" : "locked");
    if (knownFailure) {
      clearPendingPayment();
      setUncertain(false);
      if (pending.escrowAction === "create") clearEscrowSession();
      setNextStep(
        pending.escrowAction === "cancel"
          ? "Wait until the validated ledger passes the cancel deadline, then retry cancellation. Network fees may apply."
          : pending.escrowAction === "finish"
            ? "Check the escrow timing and mock delivery result before retrying release. A known ledger rejection is not a lost response."
            : "Fix the balance, policy or connection issue, then research and review again.",
      );
    } else {
      const r: Receipt = { ...pending, ...tx };
      setReceipt(r);
      savePendingPayment(r);
      saveReceipt(r);
      setUncertain(true);
      setNextStep(
        "The outcome is uncertain. Retry the read-only status check or inspect wallet activity before another ledger action.",
      );
    }
  }
  async function lockEscrow() {
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
    const pending = escrowAttempt("create");
    if (!pending) return;
    lock.current = true;
    setPhase("sending");
    setEscrowPhase("locking");
    setError("");
    setNextStep("");
    try {
      const res = await purchaseService.lockEscrow(
        result.proposal,
        pitchSeconds,
      );
      if (res.status !== "confirmed")
        throw new RequestError(
          res.error || "Escrow creation not confirmed.",
          422,
          "Check status",
          res,
        );
      setEscrowResult(res);
      setPhase("review");
      setEscrowPhase("locked");
      setSecondsRemaining(
        res.cancelAfterIso
          ? Math.max(
              0,
              Math.ceil((Date.parse(res.cancelAfterIso) - Date.now()) / 1000),
            )
          : pitchSeconds,
      );
      saveEscrowSession({
        pipeline: result,
        objective,
        pricing,
        escrow: res,
        delivery: null,
      });
      clearPendingPayment();
      setUncertain(false);
      void loadWallet();
      try {
        const delivered = await purchaseService.deliver(
          result.analysis.selectedOffer?.id ?? result.proposal.id,
          false,
        );
        setDeliveryReceipt(delivered);
        setEscrowPhase("delivered");
        saveEscrowSession({
          pipeline: result,
          objective,
          pricing,
          escrow: res,
          delivery: delivered,
        });
      } catch {
        setDeliveryReceipt({
          credentialId: "mock-unavailable",
          accessKey: "",
          serviceEndpoint: "",
          deliveredAt: new Date().toISOString(),
          status: "failed",
          details:
            "Mock delivery unavailable. Keep funds locked or request cancellation after the ledger deadline.",
        });
        setError(
          "Escrow is locked, but the demo delivery service did not respond.",
        );
        setNextStep(
          "Do not create another escrow. You can cancel this one after its ledger deadline.",
        );
      }
    } catch (e) {
      escrowError(e, pending);
    } finally {
      lock.current = false;
    }
  }
  async function releaseEscrow() {
    if (
      lock.current ||
      uncertain ||
      !result?.proposal ||
      !escrowResult?.escrowSequence ||
      deliveryReceipt?.status !== "delivered"
    )
      return;
    const pending = escrowAttempt("finish");
    if (!pending) return;
    lock.current = true;
    setEscrowPhase("releasing");
    setError("");
    setNextStep("");
    try {
      const res = await purchaseService.releaseEscrow(
        result.proposal.id,
        escrowResult.escrowSequence,
        "Mock delivery acknowledged by user.",
      );
      if (res.status !== "confirmed")
        throw new RequestError(
          res.error || "Release not confirmed.",
          422,
          "Check status",
          res,
        );
      setEscrowResult(res);
      setEscrowPhase("finished");
      setPhase("confirmed");
      const r: Receipt = { ...pending, ...res };
      setReceipt(r);
      saveReceipt(r);
      clearPendingPayment();
      clearEscrowSession();
      setUncertain(false);
      void loadWallet();
    } catch (e) {
      escrowError(e, pending);
    } finally {
      lock.current = false;
    }
  }
  async function cancelEscrow(simulateGhosting = false) {
    if (
      lock.current ||
      uncertain ||
      !result?.proposal ||
      !escrowResult?.escrowSequence
    )
      return;
    if (secondsRemaining !== 0) {
      setError("Cancellation is not yet eligible.");
      setNextStep(
        "Wait for the countdown, then retry. The ledger clock determines eligibility.",
      );
      return;
    }
    const pending = escrowAttempt("cancel");
    if (!pending) return;
    lock.current = true;
    setEscrowPhase("cancelling");
    setError("");
    setNextStep("");
    if (simulateGhosting)
      setDeliveryReceipt({
        credentialId: "mock-ghost",
        accessKey: "",
        serviceEndpoint: "",
        deliveredAt: new Date().toISOString(),
        status: "failed",
        details:
          "Simulated non-delivery; requesting cancellation after the deadline.",
      });
    try {
      const res = await purchaseService.cancelEscrow(
        result.proposal.id,
        escrowResult.escrowSequence,
        "User requested cancellation after the deadline.",
      );
      if (res.status !== "confirmed")
        throw new RequestError(
          res.error || "Cancellation not confirmed.",
          422,
          "Check status",
          res,
        );
      setEscrowResult(res);
      setEscrowPhase("cancelled");
      setPhase("confirmed");
      const r: Receipt = { ...pending, ...res };
      setReceipt(r);
      saveReceipt(r);
      clearPendingPayment();
      clearEscrowSession();
      setUncertain(false);
      void loadWallet();
    } catch (e) {
      escrowError(e, pending);
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

  const activeEscrow = [
    "locked",
    "delivering",
    "delivered",
    "releasing",
    "cancelling",
  ].includes(escrowPhase);
  const editingLocked = busy || activeEscrow;
  const isSettled =
    phase === "confirmed" ||
    escrowPhase === "finished" ||
    escrowPhase === "cancelled";

  const recovery = paymentRecovery(receipt, uncertain);
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
        description="Tell us what you need and your price range in your currency. Research the web, or explicitly choose the Testnet payment demo."
      />
      <div className="purchase-progress">
        {(mode === "web"
          ? ["Item & price", "Web research", "Compare & visit seller"]
          : [
              "Your objective",
              "Agent research",
              "Your review",
              settlementMode === "escrow" ? "Digital Safe" : "XRPL payment",
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
              <fieldset className="search-mode" disabled={editingLocked}>
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
                disabled={editingLocked}
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
                    disabled={editingLocked}
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
                  disabled={
                    editingLocked || !objective.trim() || !pricing.trim()
                  }
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
                    !uncertain && !activeEscrow && (
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
                  {activeEscrow&&!uncertain&&<><button className="button button-ghost" disabled={busy||deliveryReceipt?.status!=='delivered'||secondsRemaining===0} onClick={()=>void releaseEscrow()}>Retry escrow release</button><button className="button button-ghost" disabled={busy||secondsRemaining!==0} onClick={()=>void cancelEscrow()}>Retry escrow cancellation</button></>}
                  {mode === "demo" && !uncertain && !activeEscrow && (
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
                      disabled={editingLocked}
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
                      disabled={editingLocked}
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
                        Request refund Guarantee Window:
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
                    ? `Native XRPL Escrow Safe (${pitchSeconds}s cancellation window)`
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
                          <strong
                            style={{ fontSize: 13, color: "var(--text)" }}
                          >
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
                          · Time-based escrow; demo delivery check
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
                        Refund eligible in
                      </span>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          fontFamily: "monospace",
                          color:
                            secondsRemaining === 0
                              ? "var(--orange)"
                              : "var(--amber)",
                        }}
                      >
                        {secondsRemaining !== null
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
                          : "Simulated delivery received"}
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
                        disabled={
                          busy ||
                          uncertain ||
                          deliveryReceipt?.status !== "delivered" ||
                          secondsRemaining === 0
                        }
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
                        disabled={busy || uncertain || secondsRemaining !== 0}
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
                          into the on-chain XRPL Digital Safe. Funds are
                          released by a separate finish transaction. This
                          prototype uses a simulated delivery check;
                          cancellation requires another transaction after the
                          deadline.
                        </>
                      ) : (
                        <>
                          I have reviewed this recipient and amount. I authorize
                          this direct Testnet payment from the shared demo
                          wallet.
                        </>
                      )}
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
                            Approve & pay {formatXrp(result.proposal.amount)}{" "}
                            XRP
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
                    ? "Digital Safe: Escrow principal returned."
                    : receipt.status === "confirmed"
                      ? "Payment confirmed."
                      : "Payment needs attention."}
              </h2>
              <p className="panel-subtitle">
                {escrowPhase === "finished"
                  ? `Escrow #${escrowResult?.escrowSequence ?? "—"} settled on XRPL Testnet. Demo delivery was simulated.`
                  : escrowPhase === "cancelled"
                    ? `Escrow principal of ${formatXrp(receipt.amount)} XRP returned. Transaction fees are not refunded.`
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

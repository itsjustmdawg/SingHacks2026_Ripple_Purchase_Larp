"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Search,
  X,
  LoaderCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/brand";
import { WorkspaceNav } from "@/components/dashboard/WorkspaceNav";
import {
  getReceipts,
  formatXrp,
  purchaseService,
  type Receipt,
} from "@/services/purchase";
export function ActivityPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const sync = () => {
      setReceipts(getReceipts());
      setLoaded(true);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  const filtered = receipts.filter(
    (r) => filter === "all" || r.status === filter,
  );
  return (
    <main id="main" className="wrap page-main">
      <WorkspaceNav />
      <PageHeader
        eyebrow="YOUR ACTIVITY"
        title="Every purchase leaves a trail."
        description="Review receipts from purchases made in this browser, or look up a transaction directly on XRPL Testnet."
      />
      <div className="market-toolbar">
        <div className="chips">
          {["all", "confirmed", "failed", "pending"].map((s) => (
            <button
              className={"chip " + (filter === s ? "chip-active" : "")}
              key={s}
              onClick={() => setFilter(s)}
            >
              {s === "all" ? "All receipts" : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="micro">{receipts.length} BROWSER RECEIPTS</span>
      </div>
      {filtered.length > 0 ? (
        <div className="receipt-table">
          {filtered.map((r) => (
            <button
              key={r.transactionId}
              className="receipt-row"
              onClick={() => setSelected(r)}
            >
              <span>
                <strong>{r.provider}</strong>
                <small>{r.objective.slice(0, 75)}</small>
              </span>
              <span>{formatXrp(r.amount)} XRP</span>
              <span
                className={
                  r.status === "confirmed" ? "status-success" : "status-failed"
                }
              >
                {r.status}
              </span>
              <code>{r.hash ? r.hash.slice(0, 12) + "…" : "No hash"}</code>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Clock size={30} />
          <h2>{loaded ? "No receipts here yet." : "Loading receipts…"}</h2>
          <p>
            {filter === "all"
              ? "Your completed purchases will appear here. Receipts are stored in this browser; use a transaction hash to check the ledger independently."
              : "No receipts match this status."}
          </p>
          <Link className="button button-primary" href="/dashboard">
            Start a purchase
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      <section className="panel" style={{ marginTop: 35 }}>
        <h2>Have a transaction hash?</h2>
        <p className="panel-subtitle">
          Verify a receipt independently against XRPL Testnet.
        </p>
        <form
          className="market-search"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const r = await purchaseService.verify(hash.trim());
              if (r.status !== "confirmed")
                throw new Error(r.error ?? "Transaction is not confirmed.");
              setSelected({
                ...r,
                objective: "Receipt looked up on XRPL Testnet",
                provider: "XRPL transaction",
                amount:
                  "deliveredXrp" in r && typeof r.deliveredXrp === "number"
                    ? r.deliveredXrp
                    : 0,
              });
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Verification unavailable.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Search size={18} />
          <input
            aria-label="XRPL transaction hash"
            placeholder="64-character transaction hash"
            pattern="[A-Fa-f0-9]{64}"
            required
            value={hash}
            onChange={(e) => setHash(e.target.value)}
          />
          <button
            disabled={busy}
            className="icon-button"
            aria-label="Verify transaction"
          >
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <ArrowUpRight size={18} />
            )}
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <dialog
        className="receipt-dialog panel"
        ref={dialog}
        onClose={() => setSelected(null)}
        aria-labelledby="receipt-title"
      >
        {selected && (
          <>
            <header>
              <h2 id="receipt-title">Transaction receipt</h2>
              <button
                className="icon-button"
                aria-label="Close receipt"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div
              className={
                selected.status === "confirmed" ? "status-success" : ""
              }
            >
              <CheckCircle2 size={27} />
            </div>
            <div className="review-amount">
              {formatXrp(selected.amount)}
              <small> XRP</small>
            </div>
            <dl className="review-details">
              <dt>Status</dt>
              <dd>{selected.status}</dd>
              <dt>Provider</dt>
              <dd>{selected.provider}</dd>
              <dt>Objective</dt>
              <dd>{selected.objective}</dd>
              <dt>Hash</dt>
              <dd>{selected.hash ?? "Not returned"}</dd>
              <dt>Ledger</dt>
              <dd>{selected.ledgerIndex ?? "Unavailable"}</dd>
              <dt>Confirmed</dt>
              <dd>
                {selected.confirmedAt
                  ? new Date(selected.confirmedAt).toLocaleString()
                  : "Not confirmed"}
              </dd>
            </dl>
            {selected.hash && (
              <a
                className="button button-primary"
                href={
                  "https://testnet.xrpl.org/transactions/" +
                  encodeURIComponent(selected.hash)
                }
                target="_blank"
                rel="noreferrer"
              >
                Open XRPL explorer
                <ArrowUpRight size={17} />
              </a>
            )}
          </>
        )}
      </dialog>
    </main>
  );
}

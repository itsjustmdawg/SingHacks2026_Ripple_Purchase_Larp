"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/brand";
import { agents, sampleObjectives } from "@/data/product";
import { PriceFields } from "@/components/shopping/PriceFields";
import type { SearchMode } from "@/types/shopping";
export function LaunchFlow({
  initialObjective,
  initialPricing = "",
  initialMode = "web",
}: {
  initialObjective: string;
  initialPricing?: string;
  initialMode?: SearchMode;
}) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState(initialObjective);
  const [budget, setBudget] = useState(initialPricing);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [review, setReview] = useState(false);
  const router = useRouter();
  const valid = objective.trim().length > 0 && budget.trim().length > 0;
  return (
    <main id="main" className="wrap page-main">
      <div className="launch-layout">
        <PageHeader
          eyebrow="LAUNCH YOUR AGENT TEAM"
          title="A little direction goes a long way."
          description="Set the objective, meet your team, and review the plan. No payment is made at launch."
        />
        <div className="launch-steps">
          {["Your objective", "Your team", "Review & launch"].map((s, i) => (
            <button
              key={s}
              className={step === i ? "active" : ""}
              disabled={i > step}
              onClick={() => setStep(i)}
            >
              <span>{i < step ? <Check size={12} /> : i + 1}</span>
              {s}
            </button>
          ))}
        </div>
        <section className="panel launch-panel">
          {step === 0 && (
            <>
              <h2>What would make your day easier?</h2>
              <p className="panel-subtitle">
                Be specific about the product and features you want. Your team
                will handle the comparison.
              </p>
              <PriceFields
                item={objective}
                pricing={budget}
                onItem={setObjective}
                onPricing={setBudget}
              />
              <fieldset className="search-mode">
                <legend>Research mode</legend>
                {(["web", "demo"] as const).map((m) => (
                  <label key={m}>
                    <input
                      type="radio"
                      name="launch-mode"
                      checked={mode === m}
                      onChange={() => setMode(m)}
                    />
                    {m === "web"
                      ? "Web search · real sources"
                      : "Testnet demo · sample catalog"}
                  </label>
                ))}
              </fieldset>
              <div className="chips">
                {sampleObjectives.map((x) => (
                  <button
                    key={x.label}
                    className="chip"
                    onClick={() => {
                      setObjective(x.text.replace(/\s+under.*$/i, ""));
                      setBudget("max 5 XRP");
                      setMode("demo");
                    }}
                  >
                    Demo: {x.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Meet the team behind your request.</h2>
              <p className="panel-subtitle">
                Scout searches and Analyst compares your price range. Treasury,
                Policy and XRPL handle the separate Testnet payment demo.
              </p>
              <div className="launch-team">
                {agents.map((a) => (
                  <div key={a.id}>
                    <span className={"agent-avatar avatar-" + a.id}>
                      {a.initials}
                    </span>
                    <strong>{a.name}</strong>
                    <small>{a.engine}</small>
                  </div>
                ))}
              </div>
              <div className="info-banner">
                <ShieldCheck
                  size={17}
                  style={{ display: "inline", marginRight: 10 }}
                />
                Scout finds options. Analyst compares them. Treasury prepares
                the quote. Policy checks the rules. XRPL settles only after your
                explicit review.
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Everything starts with your say-so.</h2>
              <p className="panel-subtitle">
                Launching opens the purchase workspace. You can edit the
                objective before starting research.
              </p>
              <div className="quote">
                <span className="micro">YOUR OBJECTIVE</span>
                <p
                  style={{
                    fontSize: 16,
                    color: "var(--text)",
                    margin: "15px 0",
                  }}
                >
                  {objective}
                </p>
                <div className="quote-footer">
                  <span>{budget}</span>
                  <span>
                    {mode === "web" ? "Web research" : "XRPL Testnet demo"}
                  </span>
                </div>
              </div>
              <label className="review-check" style={{ marginTop: 25 }}>
                <input
                  type="checkbox"
                  checked={review}
                  onChange={(e) => setReview(e.target.checked)}
                />
                <span>
                  {mode === "web"
                    ? "Web prices and XRP equivalents are indicative. Buying happens at the seller; no funds move from this research."
                    : "These are sample products and Testnet XRP only. Every payment requires my explicit review."}
                </span>
              </label>
            </>
          )}
          <div className="form-actions">
            {step > 0 ? (
              <button
                className="button button-ghost"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <small>About a minute to get started.</small>
            )}
            <button
              className="button button-primary"
              disabled={!valid || (step === 2 && !review)}
              onClick={() => {
                if (step < 2) setStep(step + 1);
                else
                  router.push(
                    "/dashboard?objective=" +
                      encodeURIComponent(objective) +
                      "&pricing=" +
                      encodeURIComponent(budget) +
                      "&mode=" +
                      mode,
                  );
              }}
            >
              {step === 2 ? "Open purchase workspace" : "Continue"}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

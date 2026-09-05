import { ArrowUpRight, RefreshCw } from "lucide-react";
import type { WebSearchResult } from "@/types/shopping";
import { formatXrp } from "@/services/purchase";
export function WebResults({
  result,
  retry,
  disabled,
}: {
  result: WebSearchResult;
  retry: () => void;
  disabled: boolean;
}) {
  return (
    <section className="panel web-results">
      <div className="panel-heading">
        <span>Results from the web</span>
        <span className="tag">LIVE DISCOVERY</span>
      </div>
      <p className="panel-subtitle">{result.summary}</p>
      <ol className="trace-list">
        {result.trace.map((t, i) => (
          <li key={t.id}>
            <span className="trace-step">{i + 1}</span>
            <div className="trace-content">
              <div>
                <strong>{t.label}</strong>
                <span className="tag">
                  {t.engine === "gemini"
                    ? "Gemini"
                    : t.engine === "policy"
                      ? "Safety rules"
                      : "Fallback"}
                </span>
              </div>
              <p>{t.message}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="quote-list">
        {result.offers.map((o) => (
          <article
            className={"quote " + (o.eligible ? "quote-selected" : "")}
            key={o.id}
          >
            <div className="quote-top">
              <strong>{o.title}</strong>
              <span>
                {o.amount.toLocaleString("en-SG", {
                  maximumFractionDigits: 10,
                })}{" "}
                {o.currency}
              </span>
            </div>
            <p>
              {o.provider} · {o.description}
            </p>
            <div className="quote-footer">
              <span>
                ≈ {formatXrp(o.priceXrp)} XRP ·{" "}
                {o.eligible ? "In your range" : "Outside your range"}
              </span>
              <a
                className="text-link"
                href={o.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View source / seller
                <ArrowUpRight size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>
      <p className="notice-inline">
        Reported prices extracted from web research, not guaranteed checkout
        quotes. XRP equivalents use reference rates dated {result.rateAsOf}. No
        seller wallet or order-fulfillment integration is available; we do not
        pretend a Testnet transfer buys this product.
      </p>
      <div className="form-actions">
        <button
          className="button button-ghost"
          disabled={disabled}
          onClick={retry}
        >
          <RefreshCw size={16} />
          Retry web research
        </button>
      </div>
      <details style={{ marginTop: 24 }}>
        <summary>All search sources ({result.sources.length})</summary>
        <ul className="source-list">
          {result.sources.map((s, i) => (
            <li key={s.url + i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
                <ArrowUpRight size={14} />
              </a>
            </li>
          ))}
        </ul>
      </details>
      {result.suggestionsHtml && (
        <iframe
          className="search-suggestions"
          title="Google Search suggestions"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          srcDoc={
            '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https: data:"><base target="_blank">' +
            result.suggestionsHtml
          }
        />
      )}
    </section>
  );
}

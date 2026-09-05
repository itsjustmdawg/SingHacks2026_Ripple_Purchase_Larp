"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  Database,
  Cloud,
  Cpu,
  Armchair,
  ChartNoAxesCombined,
  Wrench,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/ui/brand";
import { categories, categoryLabels } from "@/data/product";
import type { CatalogOffer } from "@/types";
const icons = {
  storage: Cloud,
  api: Database,
  compute: Cpu,
  analytics: ChartNoAxesCombined,
  furniture: Armchair,
  debugging: Wrench,
};
export function Marketplace({ offers }: { offers: CatalogOffer[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("recommended");
  const [list, setList] = useState(false);
  const filtered = useMemo(
    () =>
      offers
        .filter(
          (o) =>
            (category === "All" || o.category === category) &&
            (!max || o.priceXrp <= Number(max)) &&
            [o.provider, o.service, o.description, ...o.features]
              .join(" ")
              .toLowerCase()
              .includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "price"
            ? a.priceXrp - b.priceXrp
            : b.reliabilityScore - a.reliabilityScore,
        ),
    [offers, q, category, max, sort],
  );
  return (
    <main id="main" className="wrap page-main">
      <PageHeader
        eyebrow="THE MARKETPLACE"
        title="Find your next advantage."
        description="Explore services and products your agent team can compare and purchase."
      />
      <div className="catalog-notice">
        <span className="status-dot" />
        Hackathon demo catalog · Prices in Testnet XRP · No physical goods are
        delivered
      </div>
      <div className="market-search">
        <Search size={22} />
        <input
          aria-label="Search marketplace"
          placeholder="Search services, products, capabilities…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="tag">{offers.length} listings</span>
      </div>
      <div className="market-toolbar">
        <div className="chips">
          {categories.map((c) => (
            <button
              key={c}
              className={"chip " + (c === category ? "chip-active" : "")}
              onClick={() => setCategory(c)}
            >
              {categoryLabels[c]}
            </button>
          ))}
        </div>
        <div className="market-options">
          <label className="filter-label">
            <SlidersHorizontal size={15} />
            <input
              type="number"
              aria-label="Maximum price in XRP"
              min="0"
              step="0.1"
              placeholder="Max XRP"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
          <select
            aria-label="Sort listings"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">Highest reliability</option>
            <option value="price">Lowest price</option>
          </select>
          <button
            className="icon-button"
            aria-label={list ? "Switch to grid view" : "Switch to list view"}
            onClick={() => setList(!list)}
          >
            {list ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>
      <div className="result-count">
        {filtered.length} matching{" "}
        {filtered.length === 1 ? "listing" : "listings"}
        <span>All on XRPL Testnet</span>
      </div>
      <div className={"listing-grid " + (list ? "listing-list" : "")}>
        {filtered.map((o) => {
          const Icon = icons[o.category];
          return (
            <article key={o.id} className="listing-card">
              <div className={"listing-art art-" + o.category}>
                <div className="listing-art-orbit" />
                <Icon size={58} strokeWidth={1} />
                <span className="micro">{categoryLabels[o.category]}</span>
              </div>
              <div className="listing-content">
                <div className="listing-meta">
                  <span>{o.provider}</span>
                  <span className="tag">Demo listing</span>
                </div>
                <h2>{o.service}</h2>
                <p>{o.description}</p>
                <div className="agent-tags">
                  {o.features.slice(0, 2).map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
                <div className="listing-bottom">
                  <div>
                    <strong>
                      {o.priceXrp}
                      <small> XRP</small>
                    </strong>
                    <span>
                      {Math.round(o.reliabilityScore * 100)}% catalog
                      reliability
                    </span>
                  </div>
                  <Link
                    href={
                      "/launch?objective=" +
                      encodeURIComponent(
                        "Find " +
                          o.service +
                          " from " +
                          o.provider +
                          " within " +
                          o.priceXrp +
                          " XRP",
                      )
                    }
                    className="circle-link"
                    aria-label={"Compare " + o.service}
                  >
                    <ArrowUpRight size={21} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          <Search size={30} />
          <h2>No listings match those filters.</h2>
          <p>Try a different search or increase the price limit.</p>
          <button
            className="button button-ghost"
            onClick={() => {
              setQ("");
              setCategory("All");
              setMax("");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </main>
  );
}

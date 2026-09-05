import { ActionLink, Eyebrow } from "@/components/ui/brand";
export default function NotFound() {
  return (
    <main id="main" className="wrap page-main">
      <div className="empty-state">
        <Eyebrow>404 · OFF THE MAP</Eyebrow>
        <h1>This page isn’t in the catalog.</h1>
        <p>Head back to the marketplace to find your next purchase.</p>
        <ActionLink href="/marketplace">Explore marketplace</ActionLink>
      </div>
    </main>
  );
}

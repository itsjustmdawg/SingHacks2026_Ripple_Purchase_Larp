import Link from "next/link";
import { Logo, NetworkBadge } from "@/components/ui/brand";
import { brand } from "@/data/product";
export function Footer() {
  return (
    <footer className="footer wrap">
      <div className="footer-main">
        <div>
          <Logo />
          <p>
            A little less admin.
            <br />A lot more agency.
          </p>
        </div>
        <div>
          <span className="micro">PRODUCT</span>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/agents">The agent team</Link>
          <Link href="/dashboard">Workspace</Link>
        </div>
        <div>
          <span className="micro">BUILD</span>
          <Link href="/developers">Developer guide</Link>
          <a href={brand.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <Link href="/activity">Transaction receipts</Link>
        </div>
        <div>
          <span className="micro">PROJECT</span>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#control">Trust & control</Link>
          <Link href="/login">Demo access</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Purchase LARP · SingHacks, Ripple track.</span>
        <span>Mock marketplace. Real Testnet settlement.</span>
        <NetworkBadge />
      </div>
    </footer>
  );
}

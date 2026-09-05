"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo, NetworkBadge } from "@/components/ui/brand";
const links = [
  ["Marketplace", "/marketplace"],
  ["Agents", "/agents"],
  ["Activity", "/activity"],
  ["Developers", "/developers"],
] as const;
export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (active) setSignedIn(Boolean(d.user));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, [open]);
  return (
    <header className={"navigation " + (scrolled ? "navigation-scrolled" : "")}>
      <div className="nav-inner">
        <Logo />
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([l, h]) => (
            <Link
              key={h}
              href={h}
              className={pathname.startsWith(h) ? "nav-active" : ""}
            >
              {l}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <NetworkBadge />
          <Link
            className="login-link"
            href={signedIn ? "/dashboard" : "/login"}
          >
            {signedIn ? "Workspace" : "Log in"}
          </Link>
          <Link href="/launch" className="button button-small button-primary">
            Launch agent
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <button
          className="mobile-toggle icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          {[
            ...links,
            [
              signedIn ? "Workspace" : "Log in",
              signedIn ? "/dashboard" : "/login",
            ],
            ["Launch agent", "/launch"],
          ].map(([l, h]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)}>
              {l}
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

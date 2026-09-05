import Link from "next/link";
import { ArrowUpRight, ArrowRight, Command } from "lucide-react";
import type { ReactNode } from "react";
export function Logo() {
  return (
    <Link href="/" className="wordmark" aria-label="Purchase LARP home">
      <span className="logo-symbol">
        <Command size={22} strokeWidth={2.3} />
      </span>
      <span>
        purchase<span className="wordmark-light">larp</span>
        <span className="brand-period">.</span>
      </span>
    </Link>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
  small = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      className={[
        "button",
        secondary ? "button-ghost" : "button-primary",
        small ? "button-small" : "",
      ].join(" ")}
      href={href}
    >
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow">
      <span />
      {children}
    </p>
  );
}
export function NetworkBadge() {
  return (
    <span className="network-badge">
      <span className="status-dot" />
      XRPL Testnet
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}

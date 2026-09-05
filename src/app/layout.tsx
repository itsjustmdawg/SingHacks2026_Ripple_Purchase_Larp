import type { Metadata } from "next";

import "@/styles/brand.css";
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    default: "Purchase LARP — Agentic XRPL Payments",
    template: "%s | Purchase LARP",
  },
  description:
    "Turn a purchase objective into a policy-governed, verified XRPL payment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><a className="skip-link" href="#main">Skip to content</a><Navigation/>{children}<Footer/></body>
    </html>
  );
}

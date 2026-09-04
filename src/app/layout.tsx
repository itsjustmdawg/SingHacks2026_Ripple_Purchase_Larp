import type { Metadata } from "next";

import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}

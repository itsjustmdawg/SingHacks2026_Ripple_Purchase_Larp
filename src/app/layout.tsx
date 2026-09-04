import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Autonomous Agentic Payments System",
    template: "%s | Autonomous Agentic Payments System",
  },
  description:
    "AI-driven payment decisions with policy enforcement and XRPL settlement.",
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

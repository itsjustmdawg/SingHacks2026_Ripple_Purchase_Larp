import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Purchase Larp",
  description: "XRPL-backed agentic purchasing dashboard skeleton.",
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

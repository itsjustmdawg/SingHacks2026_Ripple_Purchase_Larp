import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="mx-auto max-w-4xl text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">
          Built on the XRP Ledger
        </p>
        <h1 className="text-balance text-5xl font-bold tracking-tight text-slate-950 sm:text-7xl">
          Autonomous Agentic Payments System
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
          AI-driven payment decisions with policy enforcement and XRPL
          settlement.
        </p>
        <Link
          className="mt-10 inline-flex rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          href="/dashboard"
        >
          Open dashboard
        </Link>
      </section>
    </main>
  );
}

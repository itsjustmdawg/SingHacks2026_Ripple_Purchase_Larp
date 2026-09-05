"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LoaderCircle, LockKeyhole } from "lucide-react";
export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="auth-panel">
      <h2>Welcome to your workspace.</h2>
      <p>Sign in to give your agent team its next objective.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const b = await r.json();
            if (!r.ok) throw new Error(b.error);
            router.push(next);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to sign in.");
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Email address
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your demo password"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="button button-primary" type="submit">
          {busy ? (
            <>
              <LoaderCircle size={17} className="spin" />
              Signing in…
            </>
          ) : (
            <>
              Enter workspace
              <ArrowUpRight size={17} />
            </>
          )}
        </button>
      </form>
      <p className="auth-help">
        <LockKeyhole size={14} style={{ display: "inline", marginRight: 7 }} />
        SingHacks demo workspace. Use the credentials provided by the team. This
        demo uses a shared Testnet wallet and does not move real XRP.
      </p>
    </div>
  );
}

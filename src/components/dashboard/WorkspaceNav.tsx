"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
export function WorkspaceNav() {
  const path = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <div className="workspace-nav">
        <div>
          {[
            ["Purchase", "/dashboard"],
            ["Your team", "/dashboard/agents"],
            ["Activity", "/activity"],
          ].map(([l, h]) => (
            <Link href={h} key={h} className={path === h ? "current" : ""}>
              {l}
            </Link>
          ))}
        </div>
        <button
          className="text-button"
          onClick={async () => {
            try {
              const r = await fetch("/api/auth/session", { method: "DELETE" });
              if (!r.ok) throw new Error();
              router.push("/login");
              router.refresh();
            } catch {
              setError("Unable to sign out. Please try again.");
            }
          }}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}

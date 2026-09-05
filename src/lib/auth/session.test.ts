import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSession,
  verifySession,
  SESSION_SECONDS,
  SESSION_COOKIE,
} from "./session";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";
beforeEach(() =>
  vi.stubEnv("AUTH_SECRET", "a-test-only-secret-with-more-than-32-characters"),
);
afterEach(() => vi.unstubAllEnvs());
describe("signed demo sessions", () => {
  it("accepts genuine tokens and rejects expired sessions", () => {
    const token = createSession("demo@example.test", 1000);
    expect(verifySession(token, 1001)?.email).toBe("demo@example.test");
    expect(verifySession(token, 1000 + SESSION_SECONDS * 1000)).toBeNull();
  });
  it("rejects tampering and malformed cookies", () => {
    const token = createSession("demo@example.test");
    expect(verifySession(token + "x")).toBeNull();
    expect(verifySession("garbage")).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });
  it("rejects an old session when the secret is rotated", () => {
    const token = createSession("demo@example.test");
    vi.stubEnv("AUTH_SECRET", "another-test-only-secret-at-least-32-long");
    expect(verifySession(token)).toBeNull();
  });
  it("blocks unauthenticated API access and redirects workspace visits", () => {
    expect(proxy(new NextRequest("http://localhost/api/wallet")).status).toBe(
      401,
    );
    expect(
      proxy(new NextRequest("http://localhost/dashboard")).headers.get(
        "location",
      ),
    ).toContain("/login?next=");
  });
  it("allows signed requests but rejects cross-origin writes", () => {
    const cookie = SESSION_COOKIE + "=" + createSession("demo@example.test");
    expect(
      proxy(
        new NextRequest("http://localhost/api/wallet", { headers: { cookie } }),
      ).status,
    ).toBe(200);
    expect(
      proxy(
        new NextRequest("http://localhost/api/transaction", {
          method: "POST",
          headers: { cookie, origin: "https://attacker.test" },
        }),
      ).status,
    ).toBe(403);
  });
});

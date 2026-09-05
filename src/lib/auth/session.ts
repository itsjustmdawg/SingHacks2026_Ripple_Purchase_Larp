import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export const SESSION_COOKIE = "larp-session";
export const SESSION_SECONDS = 60 * 60 * 8;
const devSecret = randomBytes(32).toString("hex");
function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production")
    throw new Error("Configure AUTH_SECRET with at least 32 characters.");
  return devSecret;
}
export function equalSecret(a: string, b: string) {
  const x = createHmac("sha256", "credential-compare").update(a).digest();
  const y = createHmac("sha256", "credential-compare").update(b).digest();
  return timingSafeEqual(x, y);
}
export function createSession(email: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: now + SESSION_SECONDS * 1000 }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function verifySession(
  token: string | undefined,
  now = Date.now(),
): { email: string } | null {
  try {
    if (!token || token.length > 2048) return null;
    const [p, s, ...extra] = token.split(".");
    if (!p || !s || extra.length) return null;
    const expected = createHmac("sha256", secret())
      .update(p)
      .digest("base64url");
    if (!equalSecret(s, expected)) return null;
    const data = JSON.parse(Buffer.from(p, "base64url").toString());
    if (
      typeof data.email !== "string" ||
      typeof data.exp !== "number" ||
      data.exp <= now
    )
      return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";
import {
  createSession,
  equalSecret,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/lib/auth/session";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  for (const [k, v] of attempts) {
    if (v.until < now) attempts.delete(k);
  }
  const state = attempts.get(ip);
  if (state && state.count >= 10 && state.until > now)
    return NextResponse.json(
      { error: "Too many attempts. Try again in 10 minutes." },
      { status: 429 },
    );
  attempts.set(ip, {
    count: (state?.count ?? 0) + 1,
    until: state?.until ?? now + 600000,
  });
  const email = process.env.DEMO_LOGIN_EMAIL;
  const password = process.env.DEMO_LOGIN_PASSWORD;
  if (!email || !password)
    return NextResponse.json(
      { error: "Demo login has not been configured on this deployment." },
      { status: 503 },
    );
  try {
    const b = await request.json();
    if (
      typeof b.email !== "string" ||
      typeof b.password !== "string" ||
      b.email.length > 254 ||
      b.password.length > 256 ||
      !equalSecret(b.email.trim().toLowerCase(), email.toLowerCase()) ||
      !equalSecret(b.password, password)
    )
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    const token = createSession(email);
    const response = NextResponse.json({ user: { email } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    attempts.delete(ip);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to sign in. Check the demo configuration." },
      { status: 400 },
    );
  }
}

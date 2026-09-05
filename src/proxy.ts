import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/auth/")) return NextResponse.next();
  const user = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    if (path.startsWith("/api/"))
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (
    path.startsWith("/api/") &&
    request.method !== "GET" &&
    request.method !== "HEAD"
  ) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin)
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/dashboard/:path*", "/launch", "/activity", "/api/:path*"],
};

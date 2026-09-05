import assert from "node:assert/strict";
const origin = process.argv[2] || "http://localhost:3100";
const request = (path, init = {}) =>
  fetch(new URL(path, origin), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(65000),
  });
for (const path of [
  "/",
  "/marketplace",
  "/agents",
  "/agents/scout",
  "/developers",
  "/login",
])
  assert.equal((await request(path)).status, 200, path);
assert.equal((await request("/api/wallet")).status, 401);
assert.equal((await request("/dashboard")).status, 307);
const loginBody = {
  email: process.env.DEMO_LOGIN_EMAIL,
  password: process.env.DEMO_LOGIN_PASSWORD,
};
assert.ok(
  loginBody.email && loginBody.password,
  "Configure demo credentials locally.",
);
const login = async (body) =>
  request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
assert.equal(
  (await login({ ...loginBody, password: "deliberately-incorrect" })).status,
  401,
);
const response = await login(loginBody);
assert.equal(response.status, 200, "Login");
const cookie = response.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Session cookie");
const headers = { cookie };
for (const path of ["/dashboard", "/dashboard/agents", "/launch", "/activity"])
  assert.equal((await request(path, { headers })).status, 200, path);
assert.equal(
  (
    await request("/api/transaction", {
      method: "POST",
      headers: { ...headers, Origin: "https://untrusted.invalid" },
    })
  ).status,
  403,
);
const walletResponse = await request("/api/wallet", { headers });
assert.equal(walletResponse.status, 200, "Wallet");
const wallet = await walletResponse.json();
assert.equal(wallet.isFunded, true, "Testnet wallet funded");
console.log("Routes, login, API protection and funded wallet: PASS");
const research = await request("/api/agents/orchestrate", {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify({
    id: crypto.randomUUID(),
    userMessage: "Find the best chair under 5 XRP",
    timestamp: new Date().toISOString(),
  }),
});
assert.equal(research.status, 200, "Research");
const result = await research.json();
assert.ok(result.proposal, "Chair proposal");
assert.ok(result.proposal.amount <= 5);
assert.equal(result.policyDecision.approved, true);
console.log(
  "Research: PASS; engines: " + result.trace.map((t) => t.engine).join(", "),
);
const logout = await request("/api/auth/session", {
  method: "DELETE",
  headers: { ...headers, Origin: origin },
});
assert.equal(logout.status, 200);
assert.match(
  logout.headers.get("set-cookie") || "",
  /Max-Age=0|Expires=Thu, 01 Jan 1970/i,
);
console.log("Logout: PASS. No payment submitted.");

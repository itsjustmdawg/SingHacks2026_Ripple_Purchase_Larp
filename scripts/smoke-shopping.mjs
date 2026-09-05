import assert from "node:assert/strict";
const origin = process.argv[2] || "http://localhost:3000";
const login = await fetch(origin + "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify({
    email: process.env.DEMO_LOGIN_EMAIL,
    password: process.env.DEMO_LOGIN_PASSWORD,
  }),
});
assert.equal(login.status, 200, "Login");
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
async function post(path, body) {
  const r = await fetch(origin + path, {
    method: "POST",
    headers: { cookie, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65000),
  });
  const data = await r.json();
  if (!r.ok) throw Error(JSON.stringify({ status: r.status, ...data }));
  return data;
}
const p = await post("/api/shopping/prepare", {
  item: "Chair with adjustable lumbar support",
  pricing: "between 4 and 5 XRP",
  mode: "demo",
});
assert.equal(p.budget.minXrp, 4);
assert.equal(p.budget.maxXrp, 5);
const d = await post("/api/shopping/search", { token: p.token });
assert.ok(d.demo.proposal, "Demo proposal");
assert.ok(d.demo.proposal.amount >= 4 && d.demo.proposal.amount <= 5);
console.log("Demo min/max and research: PASS");
const fiat = await post("/api/shopping/prepare", {
  item: "Headphones",
  pricing: "max 200 SGD",
  mode: "web",
});
assert.ok(fiat.budget.maxXrp > 0);
assert.equal(fiat.budget.currency, "SGD");
console.log("Daily SGD → XRP conversion: PASS (" + fiat.budget.rateAsOf + ")");
if (process.argv.includes("--web")) {
  const web = await post("/api/shopping/search", { token: fiat.token });
  assert.ok(web.web.sources.length > 0, "Source-backed web research");
  assert.equal(web.demo, undefined);
  console.log(
    "Web search: " +
      web.web.sources.length +
      " sources, " +
      web.web.offers.length +
      " extracted prices; engines: " +
      web.web.trace.map((t) => t.engine).join(", "),
  );
  console.log(web.web.summary);
  if (!web.web.offers.length)
    console.log(web.web.trace.map((t) => t.message).join("\n"));
}
const denied = await fetch(origin + "/api/shopping/prepare", {
  method: "POST",
  headers: { cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    item: "Headphones",
    pricing: "max $100",
    mode: "web",
  }),
});
assert.equal(denied.status, 400);
assert.ok((await denied.json()).nextStep);
console.log("Ambiguous currency guidance: PASS. No payment submitted.");

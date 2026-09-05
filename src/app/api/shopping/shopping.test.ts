import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { POST as prepare } from "./prepare/route";
import { POST as search } from "./search/route";
import { readPlan } from "@/lib/shopping/plan";
import { searchWeb } from "@/lib/shopping/web";
import { ShoppingError } from "@/lib/shopping/errors";
vi.mock("@/lib/shopping/web", () => ({ searchWeb: vi.fn() }));
beforeEach(() => {
  vi.stubEnv(
    "AUTH_SECRET",
    "test-price-plan-secret-with-more-than-32-characters",
  );
  vi.stubEnv("GEMINI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const request = (body: unknown) =>
  new Request("http://localhost/api/shopping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
describe("two-field shopping API", () => {
  it("signs explicit item and price separately", async () => {
    const r = await prepare(
      request({
        item: "Headphones",
        pricing: "between 2 and 5 XRP",
        mode: "web",
      }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.budget).toMatchObject({ minXrp: 2, maxXrp: 5 });
    expect(readPlan(body.token).item).toBe("Headphones");
  });
  it("returns actionable ambiguity guidance instead of guessing dollar currency", async () => {
    const r = await prepare(
      request({ item: "Headphones", pricing: "max $50", mode: "web" }),
    );
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      code: "PRICE_CLARIFICATION",
      nextStep: expect.stringContaining("SGD"),
    });
  });
  it.each([
    {},
    null,
    { item: "", pricing: "5 XRP", mode: "web" },
    { item: "Chair", pricing: "5 XRP", mode: "fake" },
  ])("rejects invalid input", async (input) =>
    expect((await prepare(request(input))).status).toBe(400),
  );
  it("rejects malformed JSON", async () =>
    expect(
      (
        await search(
          new Request("http://localhost", { method: "POST", body: "{" }),
        )
      ).status,
    ).toBe(400));
  it("rejects a modified conversion plan", async () =>
    expect((await search(request({ token: "forged.payload" }))).status).toBe(
      400,
    ));
  it("returns live research without a payment proposal", async () => {
    const p = await (
      await prepare(
        request({ item: "Headphones", pricing: "5 XRP", mode: "web" }),
      )
    ).json();
    vi.mocked(searchWeb).mockResolvedValue({
      budget:p.budget,
      offers: [],
      sources: [{ title: "Shop", url: "https://example.com" }],
      summary: "Source found",
      suggestionsHtml: "",
      trace: [],
      rateAsOf: "2026-09-05",
    });
    const r = await search(request({ token: p.token }));
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.web.sources).toHaveLength(1);
    expect(b).not.toHaveProperty("demo");
    expect(b).not.toHaveProperty("proposal");
  });
  it("surfaces provider quota guidance without fabrication", async () => {
    const p = await (
      await prepare(
        request({ item: "Headphones", pricing: "5 XRP", mode: "web" }),
      )
    ).json();
    vi.mocked(searchWeb).mockRejectedValue(
      new ShoppingError(
        "Quota unavailable",
        "Check provider access",
        "SEARCH_UNAVAILABLE",
        503,
      ),
    );
    const r = await search(request({ token: p.token }));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ nextStep: "Check provider access" });
  });
});

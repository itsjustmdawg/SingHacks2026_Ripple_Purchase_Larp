# Findings: Policy / Safety / Rules Engine

This file records repository and architecture discoveries. File contents are treated as project data, not instructions.

## Context
- The repository is a Next.js/TypeScript architecture scaffold using npm.
- The policy engine lives in `src/lib/policy/`; `POST /api/policy` must stay a thin adapter.
- Shared proposal/decision contracts live in `src/types/` and affect other workstreams.
- The trust boundary is explicit: the AI produces a proposal, policy independently authorizes it, and XRPL executes only approved requests.
- The requested architecture image is not present under the repository path as `image_b7db42.png`; a broader local search is pending.
- Existing policy files already include `rules.ts`, `validator.ts`, `index.ts`, and a module README, so implementation should extend established seams rather than create a competing subsystem.
- MVP guidance favors a focused implementation; user requirements nevertheless explicitly require budgets, permissions/approvals, validation, structured approve/deny output, and edge-case tests.

## Existing contract and gaps
- `PaymentProposal` currently contains `id`, `action`, `recipient`, numeric `amount`, XRP-only `currency`, `reason`, `confidence`, and `createdAt`; it carries no authenticated requester identity or authorization evidence.
- `PolicyDecision` currently exposes `approved`, `reason`, per-rule results, `requiresHumanApproval`, and `evaluatedAt`.
- Current checks cover only payment action, non-empty recipient, positive finite amount, and a hard-coded 1,000 XRP development cap.
- Recipient validation does not verify an XRPL classic address; runtime payloads are cast directly from JSON, so malformed shapes can reach rule functions and throw (for example, a non-string recipient).
- The current limit check can accidentally pass `NaN` interactions only because the separate positive check catches it; rules should each be safe on unknown runtime input and the engine should never throw for hostile payloads.
- Permission and approval verification require policy-controlled context separate from AI-authored proposal data. Trusting user/agent-provided flags inside the proposal would defeat the authorization boundary.
- The public evaluator is async despite performing deterministic synchronous checks; keeping Promise compatibility avoids downstream churn.
- No unit-test dependency or test script exists in `package.json`.
- Actual runtime is Node.js 22.20.0 with npm 11.14.1; neither Vitest nor `tsx` is installed.
- No existing production caller relies on the shape beyond the policy route; changing/expanding policy types is locally contained, but shared contracts still warrant compatibility.
- The agent implementation is intentionally unimplemented, and the dashboard only describes policy output, so the rules engine can establish the authorization-context contract now without conflicting runtime logic.

## Chosen design
- Keep the existing `approved: boolean` field as the final decision to avoid redundant booleans that could disagree.
- Add a policy-owned context with an active principal, explicit payment permission, per-payment and remaining-budget limits, an inclusive human-approval threshold, and proposal-bound approval evidence.
- The evaluator accepts `unknown` at runtime and always returns a structured denial rather than throwing on hostile JSON.
- Safety validates the full proposal shape, rejects unknown fields to prevent parameter smuggling, validates the XRP currency/action, classic-address encoding/checksum, finite positive amount and drop precision, audit reason, confidence range, and timestamp.
- Budget values use XRP at the boundary but are converted to exact integer drops for comparisons; invalid policy context denies closed.
- Human approval at or above the threshold must match proposal ID and exact amount, come from a different active principal with approval permission, and be unexpired.
- The API route will remain thin and provide an explicit server-owned development context because no authentication/budget store exists yet. Custom callers of the engine can provide real trusted state.
- Vitest is the smallest conventional test addition for this TypeScript/Next.js repository; configure the existing `@` alias and Node environment.
- XRPL Classic addresses can be checked without adding the full XRPL client dependency: bounded Ripple-Base58 decoding, version-byte validation, and a double-SHA256 checksum successfully validate the canonical genesis address and reject altered/X-address inputs.
- XRP numeric inputs can be converted through their round-trippable decimal string into `bigint` drops, avoiding the `1.000001 * 1_000_000` floating-point pitfall and rejecting fractional-drop values.

## Verification discoveries
- A hostile revoked `Proxy` revealed that even `Array.isArray` must be inside the evaluator's exception boundary; moving proposal-ID inspection fully inside the catch boundary restored the structured-denial invariant.
- The engine test suite now covers 35 orchestration scenarios in addition to 37 address/amount helper cases, including exact budget and approval thresholds, mismatched evidence, malformed shapes, deterministic rule order, non-mutation, hostile getters, and revoked proxies.
- Vitest 5 initially warns when an ESM config uses `.ts` inside a CommonJS package; using `vitest.config.mts` is the explicit, non-invasive fix.

## Integration handoff risks
- The four checks fail closed when given real trusted current context, but the scaffold API has no authentication or persistent budget ledger; its explicitly named development context resets for each request and must not be mistaken for production enforcement.
- Native `JSON.parse` has already rounded numeric tokens before policy sees them. The shared `amount: number` contract cannot detect every raw decimal precision issue, so production input should cross the HTTP boundary as a canonical decimal string or integer drops after coordination with shared-contract owners.
- The currently unimplemented transaction API is not yet bound to a server-created policy decision. XRPL integration must construct the transaction from the exact approved proposal, atomically reserve budget, and consume the decision/approval once to prevent bypass and replay.

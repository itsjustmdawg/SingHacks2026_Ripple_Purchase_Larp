# Task Plan: Policy / Safety / Rules Engine

## Goal
Implement and verify a modular safeguard between AI decision logic and XRPL transaction execution that enforces budgets, permissions/approvals, and payment-parameter safety, returning a structured approve/deny decision with a detailed reason.

## Phases
- [x] Phase 1 — Read project context and architecture diagram; inspect existing code/tests.
- [x] Phase 2 — Design the public contract and isolated rule checks to fit the existing architecture.
- [x] Phase 3 — Implement the rules engine and integrate it with existing exports/conventions.
- [x] Phase 4 — Add comprehensive unit tests for valid flows and denial edge cases.
- [x] Phase 5 — Run relevant validation, fix defects, and document the result.

## Current Phase
All phases — complete

## Decisions
- Default to fail-closed behavior for ambiguous or malformed payment requests.
- Preserve unrelated user changes and follow the repository's established toolchain and module conventions.
- Preserve `PolicyDecision.approved` as the sole authoritative approve/deny boolean for compatibility.
- Supply budgets, permissions, and approval evidence through a separate trusted `PolicyEvaluationContext`, never through the AI-authored proposal.
- Validate XRP values as exact integer drops (maximum six decimal places) before applying limits.
- Use deterministic rule ordering: payment safety, budget, permission, human approval.
- Use Vitest in a Node environment for executable TypeScript unit tests.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---:|---|
| `image_b7db42.png` is absent from the repository and local user tree | 1 | Used the README architecture diagram and `docs/architecture.md`, which describe the same four-workstream boundary; will report the missing source artifact. |
| Combined patch attempted delete/add operations on the same paths | 1 | Split the implementation into standard update/add patches. |
| Sandboxed npm was cache-only and could not fetch Vitest (`ENOTCACHED`) | 1 | Retried the same scoped npm install with user-approved network access; install completed with zero reported vulnerabilities. |
| Vitest startup hit Windows sandbox `spawn EPERM` | 1 | Reran the scoped test script with approved execution outside the sandbox. |
| Revoked Proxy input escaped `readSafeProposalId` before its try/catch | 1 | Moved all reflective operations inside the fail-closed catch boundary. |
| Sandboxed Next.js build compiled but its TypeScript worker hit `spawn EPERM` | 1 | Reran the scoped production build with approved execution outside the sandbox; it completed successfully. |
| Final `rg` line-reference query had a PowerShell quoting error | 1 | Reissued the query with a shell-safe single-quoted pattern. |

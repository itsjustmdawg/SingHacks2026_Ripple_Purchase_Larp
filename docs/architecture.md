# Architecture

The system follows one directional multi-agent workflow:

1. The user enters a service objective and optional XRP budget.
2. Gemini Market Scout semantically matches the objective to `src/lib/catalog/` offers.
3. Gemini Deal Analyst selects among quotes that deterministic budget checks mark eligible.
4. Treasury feeds the winning quote into `createPaymentProposal()`.
5. The policy engine evaluates the proposal against independent server rules.
6. The user reviews the exact recipient and amount.
7. The execution endpoint repeats policy authorization on the exact proposal.
8. The XRPL service signs locally, submits, and waits for validation.
9. The frontend displays concise agent receipts, the verdict, and ledger proof.

## Responsibility boundaries

### Discovery and analysis

`src/lib/catalog/` is a mock marketplace containing public vendor data and XRPL
recipient addresses. `src/lib/agents/` contains separate Scout, Deal Analyst,
Treasury, and orchestration modules. Each module has typed input/output and
emits a concise decision receipt. These receipts describe results rather than
exposing private chain-of-thought.

### Proposal generation

`src/lib/agent/` interprets user intent and proposes an action. It does not
authorize payments or access wallets. Treasury reuses `createPaymentProposal()`
to preserve the existing proposal validation contract.

### Authorization

`src/lib/policy/` evaluates only structured proposals. It remains deterministic
and independent of the model, and it never submits transactions.
`authorizePaymentProposal()` is the server-side handoff: it snapshots and
evaluates an untrusted proposal, then derives a transaction request only after
all policy rules approve that exact snapshot.

### Execution

`src/lib/xrpl/` constructs, signs, submits, and verifies only requests that have
already been approved. It does not decide whether a user's objective is valid.
`POST /api/transaction` accepts a complete `PaymentProposal`, evaluates it with
server-owned policy context, and derives the exact XRPL request only after that
same immutable proposal snapshot is approved. Client-authored approval flags or
transaction requests are rejected.

### Presentation

`src/app/` and `src/components/` collect user input and display workflow state.
They call API boundaries rather than embedding agent, policy, or XRPL business
logic.

## Current implementation

Gemini powers the Scout and Deal Analyst through separate structured calls. All
returned catalog IDs are validated, and deterministic matching/scoring remains
as a graceful fallback. Treasury constructs the proposal, the policy layer
authorizes it independently, and the XRPL service signs, submits, and verifies
XRP payments. The default configuration targets XRPL Testnet. The mock catalog
and environment-backed policy must be replaced by authenticated, transactional
services before production use.

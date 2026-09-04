# Architecture

The system follows one directional workflow:

1. The user enters a payment-related objective in the frontend.
2. The agent converts the objective into a typed `PaymentProposal`.
3. The policy engine evaluates the proposal against independent rules.
4. An approved proposal is converted into a `TransactionRequest`.
5. The XRPL service signs and submits the request.
6. The service waits for validated-ledger confirmation.
7. A `TransactionResult` containing the status and proof is returned.
8. The frontend displays the reasoning, authorization decision, and proof.

## Responsibility boundaries

### Reasoning

`src/lib/agent/` interprets user intent and proposes an action. It does not
authorize payments or access wallets.

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

The deterministic agent and optional OpenAI-backed planner create proposals,
the policy layer authorizes them, and the XRPL service signs, submits, and
verifies XRP payments. The default configuration targets XRPL Testnet. The
environment-backed development policy must be replaced by authenticated,
transactional identity, budget, and approval storage before production use.

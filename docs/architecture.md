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

### Execution

`src/lib/xrpl/` constructs, signs, submits, and verifies only requests that have
already been approved. It does not decide whether a user's objective is valid.

### Presentation

`src/app/` and `src/components/` collect user input and display workflow state.
They call API boundaries rather than embedding agent, policy, or XRPL business
logic.

## Current scaffold behavior

The agent and XRPL services throw explicit not-implemented errors. Their API
routes translate those errors into HTTP `501` responses. The policy engine uses
small, clearly marked development rules so its integration boundary can be
tested without claiming production authorization behavior.

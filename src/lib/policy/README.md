# Policy module

Owned by the Policy / Safety workstream. This module authorizes or rejects a
runtime payment proposal independently of the AI model and never submits a
transaction.

`evaluatePaymentPolicy(proposal, context)` evaluates four deterministic rules
in order:

1. payment parameter safety and XRPL Classic-address validity;
2. per-transaction and remaining XRP budgets;
3. active-principal payment permissions;
4. proposal-bound human approval when the configured threshold is reached.

The proposal is untrusted model output. The `PolicyEvaluationContext` is a
separate authorization input and must be resolved from authenticated server
state. It contains the principal, live budget state, approval threshold, and
any trusted approval evidence. Missing or invalid context denies by default.

The API resolves its development context from server-owned environment values
through `createPolicyContextFromEnvironment()`. Explicitly malformed values
produce HTTP `503` rather than silently widening authorization. Available
controls are:

| Variable | Default | Purpose |
| --- | --- | --- |
| `POLICY_PRINCIPAL_ID` | `development-user` | Trusted development principal |
| `POLICY_SPENDING_ENABLED` | `true` | Emergency spending kill switch |
| `POLICY_TRANSACTION_LIMIT_XRP` | `1000` | Maximum XRP per proposal |
| `POLICY_REMAINING_BUDGET_XRP` | `1000` | Static development budget remaining |
| `POLICY_APPROVAL_THRESHOLD_XRP` | `100` | Business approval threshold; `none` disables it |

`authorizePaymentProposal()` snapshots the untrusted proposal, evaluates every
rule, and derives a `TransactionRequest` from that exact snapshot only when the
decision is approved. Server orchestration should use this helper instead of
accepting an independently constructed transaction request from the client.

Authentication and persistent budget storage still do not exist. Replace the
development context before real funds or concurrent spending are enabled;
cumulative budget state must be reserved atomically to prevent two simultaneous
approvals from overspending it. Disabling the business-approval threshold does
not disable the wallet layer's separate human signing confirmation.

Before enabling XRPL submission, the server integration must also:

- parse monetary input from canonical decimal strings or integer drops before
  converting it to the current numeric proposal contract;
- call `authorizePaymentProposal()` server-side and pass its derived request to
  the XRPL layer rather than trusting client-created approval or transaction data;
- consume approvals/decisions once and enforce proposal-id idempotency to stop
  replayed payments.

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

The API scaffold uses `createDevelopmentPolicyContext()` because authentication
and persistent budget storage do not exist yet. Replace it before real funds or
concurrent spending are enabled; cumulative budget state must be reserved
atomically to prevent two simultaneous approvals from overspending it.

Before enabling XRPL submission, the server integration must also:

- parse monetary input from canonical decimal strings or integer drops before
  converting it to the current numeric proposal contract;
- build the transaction from the exact proposal that passed policy rather than
  trusting a client-created `approved` value or independent transaction body;
- consume approvals/decisions once and enforce proposal-id idempotency to stop
  replayed payments.

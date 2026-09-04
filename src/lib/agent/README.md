# Agent module

Owned by the AI Agent workstream. This module interprets user objectives and
produces typed `PaymentProposal` values. It must not authorize or execute a
payment.

## Current behavior

`createPaymentProposal` implements a transparent deterministic MVP for direct
XRP objectives. It recognizes:

- Outbound intents such as `pay`, `send`, `transfer`, `tip`, `purchase`, or
  `buy`
- Payment-request intents such as `request` or `collect ... from`
- XRP Classic-address-shaped recipients
- Amounts written as `10 XRP` or `XRP 10`, with up to six decimal places
- Optional purpose text following `for`

Incomplete or ambiguous input returns an explicit `none` proposal with low
confidence, so policy cannot accidentally authorize it. Runtime request
validation rejects malformed or unexpected API fields.

When `LLM_API_KEY` is configured, the API uses the OpenAI Responses API with a
strict JSON schema. `LLM_MODEL` defaults to `gpt-5.6-luna`, and `LLM_BASE_URL`
can override the API base URL. Invalid or unavailable model output falls back to
the deterministic extractor; callers can disable that fallback when they need
the model error to surface.

## Example

```text
Pay 2.5 XRP to rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh for market data
```

The planner extracts the proposed action, recipient, amount, currency, reason,
and confidence. The policy module still validates the address checksum,
permissions, budget, and approval requirements independently.

## Integration seam

Alternative model providers implement `AgentDecisionModel` and return the same
small decision shape. The planner always converts that result into the shared
`PaymentProposal` contract. Models never receive policy authority or wallet
access.

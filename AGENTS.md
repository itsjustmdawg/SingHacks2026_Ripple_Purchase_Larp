# Project Context & Guidelines: SingHacks 2026 Ripple Track

## Project Overview
- **Project**: SingHacks2026_Ripple_Purchase_Larp
- **Problem Statement**: Ripple — AI-Native Business on XRPL
- **Goal**: An agentic AI-powered platform for automated catalogue browsing, price/product comparison, decision-making, and autonomous purchasing on XRPL.

## Available Agent Skills (.agents/skills)
The following skills are linked into `.agents/skills/` and can be invoked whenever relevant:
- `xrpl-agentic-resources`: Curated context pack for XRPL AI & agent resources, live amendments, fees, and documentation indices.
- `xrpl-agent-wallet`: Safe wallet creation (.env storage, no chat leak), signing ceremonies, and transaction submission.
- `xrpl-payments`: Constructing XRPL payments (XRP, RLUSD, escrows, trust lines).
- `rlusd-x402`: HTTP 402 pay-per-call resource access and payment protocol on XRPL.
- `rlusd-transfer`: Transfer and payment workflows with prepare, review, execute, and receipt steps.
- `rlusd-wallets`: Local wallet alias management and pre-flight checks.
- `rlusd-trustline`: Creating and updating RLUSD XRPL trust lines.
- `use-rlusd`, `use-rlusd-xrpl`, `use-rlusd-ethereum`, `use-rlusd-evm-defi`: Multichain RLUSD routing, AMM, and DeFi workflows.
- `ows`: Open Wallet Standard multi-chain wallet management.

## XRPL Development Best Practices
1. **Network**: Default to XRPL Testnet / Devnet during prototyping. Never hardcode private seeds or secrets in code or chat transcripts; store in `.env`.
2. **Testnet RPC / Faucets**:
   - XRPL Testnet: `wss://s.altnet.rippletest.net:51233` / `https://s.altnet.rippletest.net:51234`
   - Testnet Faucet: `https://faucet.altnet.rippletest.net/accounts`
   - RLUSD Faucet: https://tryrlusd.com/
3. **Transaction Structure**:
   - Always verify account sequence, current network reserve, and base fees dynamically (use `xrpl-fee-settings.json` or live query).
   - Use `SourceTag` and `Memos` for audit trails in agentic payments.
4. **Autonomous Payments**:
   - Leverage `x402` or MPP standard for machine-to-machine, pay-per-call, or autonomous checkout workflows.

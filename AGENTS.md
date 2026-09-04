# Project Context & Guidelines: SingHacks 2026 Ripple Track

## Project Overview

- Project: SingHacks2026_Ripple_Purchase_Larp
- Problem statement: Ripple - AI-Native Business on XRPL
- Goal: an agentic AI-powered purchasing flow with catalogue browsing,
  comparison, decision support, and XRPL-backed payment.

## Stack Boundary

- Use TypeScript/Next.js for the frontend UI in `frontend/`.
- Use Python/FastAPI for backend services in `backend/`.
- Keep XRPL client work, x402 verification, wallet signing, settlement, and
  transaction verification in the Python backend.
- Keep the TypeScript frontend focused on inputs, chat/agent interaction
  display, status, and logs.

## XRPL Development Best Practices

1. Default to XRPL Testnet or Devnet during prototyping.
2. Never hardcode private seeds, keys, or credentials in code or chat.
3. Store local secrets in ignored environment files.
4. Verify account sequence, current reserve, and fees dynamically before real
   transactions.
5. Use SourceTag and Memos where useful for audit trails.
6. Keep autonomous payments behind explicit policy checks.

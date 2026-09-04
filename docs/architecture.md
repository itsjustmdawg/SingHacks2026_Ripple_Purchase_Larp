# Architecture

The prototype is split into a TypeScript frontend, a Python backend, and XRPL.

```text
TypeScript Frontend (Next.js)
  - Agent interaction and chat UI
  - Customer request and budget inputs
  - Live transaction status and logs
        |
        | HTTP REST / WebSockets
        v
Python Backend (FastAPI)
  - XRPL client integration
  - x402 payment and verification engine
  - Agent wallet signing and settlement
  - Hackathon feedback hook and tooling
        |
        v
XRPL Testnet / Devnet
```

## Current State

This branch only provides a runnable dashboard skeleton:

- `frontend/` renders the TypeScript UI.
- `backend/app.py` exposes placeholder `/health` and `/workflow` endpoints.
- No wallet secrets are read.
- No transaction is signed or submitted.

Future branches should add the agent flow, backend API contracts, x402
verification, and XRPL transaction handling behind the Python backend.

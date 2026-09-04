# Purchase Larp

A hackathon prototype for an AI-assisted purchasing flow on XRPL.

This branch is intentionally a skeleton. It gives the team a visible TypeScript
frontend and a tiny Python backend health endpoint, without implementing agent
logic, wallet signing, x402, or XRPL settlement yet.

## Stack

- Frontend: TypeScript with Next.js in `frontend/`
- Backend: Python with FastAPI in `backend/`
- Blockchain: XRPL Testnet or Devnet

## Run Locally

Fast path on Windows:

```powershell
.\dev.bat
```

The launcher installs missing dependencies and starts both services:

- Backend: [http://localhost:8787](http://localhost:8787)
- Frontend: [http://localhost:3000](http://localhost:3000)

Press `Ctrl+C` in the launcher terminal to stop both services.

Manual path:

```powershell
npm install --prefix frontend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Start the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8787
```

Start the frontend in a second terminal:

```powershell
npm run dev --prefix frontend
```

## Test It

```powershell
npm run typecheck --prefix frontend
.\.venv\Scripts\python.exe -m py_compile backend\app.py
```

With both services running, check:

- [http://localhost:8787/health](http://localhost:8787/health) returns backend
  status JSON
- [http://localhost:3000](http://localhost:3000) shows the dashboard skeleton

## Current Skeleton

- Static customer request panel
- Static payment summary panel
- Four workflow states: Objective, Agent Proposal, Policy Check, XRPL Payment
- Backend `/health` endpoint so the UI can show whether the Python service is
  reachable

## Challenge Track

This repository includes the Singhacks Ripple challenge materials:

- `resources.md`
- `Singhacks-challenge-statement.pdf`
- `hook/`
- `agent-instruction.md`
- `skills/xrpl-agentic-resources/`

Keep the feedback hook enabled during the build and keep all blockchain
settlement work on XRPL, not an EVM sidechain.

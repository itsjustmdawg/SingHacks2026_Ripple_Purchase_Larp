from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Purchase Larp Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "purchase-larp-backend",
        "status": "ready",
        "network": "testnet",
    }


@app.get("/workflow")
def workflow() -> dict[str, object]:
    return {
        "status": "skeleton",
        "stages": ["objective", "agent-proposal", "policy-check", "xrpl-payment"],
    }

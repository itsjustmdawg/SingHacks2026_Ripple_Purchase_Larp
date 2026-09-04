# Python Agent Integration Guide for XRPL Service

This guide explains how Python AI agents (e.g. built with LangChain, LlamaIndex, CrewAI, or FastAPI) interact with the TypeScript XRPL Transaction Service.

## Architecture

```text
┌─────────────────────────────────────────┐
│       Python AI Agent (Person 1)        │
│   - Understands user objective          │
│   - Browses catalog & recommends item   │
│   - Builds PaymentProposal              │
└────────────────────┬────────────────────┘
                     │
                     │ HTTP POST /api/transaction with PaymentProposal
                     ▼
┌─────────────────────────────────────────┐
│     TypeScript Policy Engine (Person 2) │
│   - Enforces budget, permissions, rules │
│   - Re-authorizes the exact proposal    │
└────────────────────┬────────────────────┘
                     │
                     │ HTTP POST /api/transaction
                     ▼
┌─────────────────────────────────────────┐
│     TypeScript XRPL Service (Person 3)  │
│   - Builds XRPL payment with drops      │
│   - Attaches SourceTag 20260530 & Memo  │
│   - Signs locally (key never leaves TS) │
│   - Executes submitAndWait on Testnet   │
│   - Returns TransactionResult + Proof   │
└─────────────────────────────────────────┘
```

---

## Service Endpoints

Base URL: `http://localhost:3000` (or your deployment URL)

### 1. `GET /api/wallet`
Fetch the active agent's public address and spendable balance before deciding to purchase.

**Response (HTTP 200)**:
```json
{
  "address": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "balanceXrp": 1000.0,
  "spendableXrp": 998.9999,
  "reservedXrp": 1.0,
  "ownerCount": 0,
  "isFunded": true
}
```

---

### 2. `POST /api/transaction`
Re-authorizes a complete payment proposal with server-owned policy and executes
it on the XRP Ledger only when approved. Calling `/api/policy` first is optional
for UI previews and does not create a reusable approval token.

**Request Payload**:
```json
{
  "id": "proposal-abc-123",
  "action": "payment",
  "recipient": "rPT1Sjq2YGrBMTttX4GZHjKu9DYfzbpAYe",
  "amount": 10.5,
  "currency": "XRP",
  "reason": "Autonomous cloud storage subscription",
  "confidence": 0.95,
  "createdAt": "2026-09-05T00:20:00.000Z"
}
```

**Response (HTTP 200 on success, HTTP 422 on ledger failure)**:
```json
{
  "transactionId": "tx-172549283-abc12",
  "proposalId": "proposal-abc-123",
  "status": "confirmed",
  "hash": "8C19D4D04C253B3C8436B287F477E6A93F6294C0...",
  "ledgerIndex": 94820195,
  "explorerUrl": "https://testnet.xrpl.org/transactions/8C19D4D04C253B3C8436B287F477E6A93F6294C0...",
  "submittedAt": "2026-09-05T00:20:00.000Z",
  "confirmedAt": "2026-09-05T00:20:04.000Z",
  "error": null
}
```

---

### 3. `GET /api/transaction/verify?hash=<TX_HASH>`
Queries the XRP Ledger to confirm finality and decode the original audit memo.

**Response (HTTP 200)**:
```json
{
  "transactionId": "verify-8C19D4D0...",
  "proposalId": "proposal-abc-123",
  "status": "confirmed",
  "hash": "8C19D4D0...",
  "ledgerIndex": 94820195,
  "explorerUrl": "https://testnet.xrpl.org/transactions/8C19D4D0...",
  "confirmedAt": "2026-09-05T00:20:04.000Z",
  "deliveredXrp": 10.5,
  "sender": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "destination": "rPT1Sjq2YGrBMTttX4GZHjKu9DYfzbpAYe",
  "auditMemo": {
    "proposalId": "proposal-abc-123",
    "agent": "autonomous-payment-agent",
    "reason": "Autonomous cloud storage subscription",
    "timestamp": "2026-09-05T00:20:00.000Z"
  },
  "error": null
}
```

---

## Ready-to-Use Python Client Snippet

Install `httpx`:
```bash
pip install httpx
```

Copy and use this client in your Python agent code:

```python
from datetime import datetime, timezone
from typing import Any, Dict

import httpx

class XrplAgentServiceClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=25.0)

    def get_wallet_info(self) -> Dict[str, Any]:
        """Fetch active agent wallet address and spendable balance."""
        res = self.client.get(f"{self.base_url}/api/wallet")
        res.raise_for_status()
        return res.json()

    def execute_payment(
        self,
        proposal_id: str,
        recipient: str,
        amount_xrp: float,
        reason: str,
        confidence: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Submit a complete proposal for policy authorization and XRPL execution.
        Blocks until validated ledger confirmation (typically 3-5 seconds).
        """
        payload: Dict[str, Any] = {
            "id": proposal_id,
            "action": "payment",
            "recipient": recipient,
            "amount": amount_xrp,
            "currency": "XRP",
            "reason": reason,
            "confidence": confidence,
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }

        res = self.client.post(f"{self.base_url}/api/transaction", json=payload)
        return res.json()

    def verify_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """Verify transaction confirmation and fetch on-chain proof receipt."""
        res = self.client.get(f"{self.base_url}/api/transaction/verify", params={"hash": tx_hash})
        return res.json()


# --- Example Usage in Python Agent ---
if __name__ == "__main__":
    xrpl = XrplAgentServiceClient()

    # 1. Inspect wallet balance
    wallet = xrpl.get_wallet_info()
    print(f"Active Agent Wallet: {wallet['address']}")
    print(f"Spendable Balance  : {wallet['spendableXrp']} XRP")

    # 2. Execute payment for an approved purchase
    recipient = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
    proposal_id = "agent-purchase-001"
    
    print("\nExecuting payment on XRPL Testnet...")
    tx_result = xrpl.execute_payment(
        proposal_id=proposal_id,
        recipient=recipient,
        amount_xrp=1.5,
        reason="Autonomous API subscription purchase"
    )

    print(f"Status      : {tx_result['status']}")
    print(f"Hash        : {tx_result['hash']}")
    print(f"Explorer URL: {tx_result['explorerUrl']}")
```

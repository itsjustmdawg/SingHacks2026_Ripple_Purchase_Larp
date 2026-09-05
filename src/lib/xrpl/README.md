# XRPL module

Owned by the XRPL / Transaction workstream. This module constructs, signs,
submits, waits for validation, and verifies XRP payments only after policy
approval. It targets XRPL Testnet by default, signs locally, adds the starter-kit
SourceTag and audit memo, and returns a ledger index and explorer receipt. It
never exposes wallet secrets through an API response.

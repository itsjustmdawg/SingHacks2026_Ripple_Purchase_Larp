# Vercel deployment

Keep the existing Next.js backend; no Python migration, database or separate API
service is needed for this hackathon demo.

1. Run `npx vercel login`, then `npx vercel link` for your project.
2. In Vercel Project Settings → Environment Variables, configure the variables
   from `.env.example` for Production. Keep secrets server-only (never add a
   `NEXT_PUBLIC_` prefix). `XRPL_RPC_URL` may stay absent.
3. Configure one faucet-funded **Testnet** `XRPL_WALLET_SEED`. A temporary
   in-memory wallet is unsuitable for separate serverless invocations.
4. Configure random `AUTH_SECRET` and private shared demo login credentials.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then
   `npx vercel --prod`. The config requests Singapore and 60-second API limits.

Vercel CLI publication works independently of GitHub integration. If GitHub
linking fails, connect the repository separately through the Vercel dashboard
after granting its GitHub application access; pushing Git alone will not deploy
until that integration works. Production environment changes require redeploying.

## Read-only smoke test

With matching login credentials in your ignored `.env.local`:

```sh
node --env-file=.env.local scripts/smoke-demo.mjs https://your-site.vercel.app
```

Checks public routes, login rejection/success, signed sessions, protected routes,
cross-origin rejection, wallet readiness, and real multiagent research. It uses
Gemini quota for one request but **does not submit a payment**. Complete the last
payment step manually in the dashboard after reviewing the displayed details.

## Honest submission boundaries

- Shared Testnet demo access, not signup, individual balances or mainnet custody.
- Two Gemini specialists; Treasury, Policy and settlement intentionally use code.
- Demo catalog; no physical delivery or live merchant fulfillment.
- Receipts stored locally in the browser, not a durable central audit database.
- In-memory login throttling and environment policy budgets are hackathon limits,
  not distributed production rate limiting or cumulative spend accounting.
- Browser visual QA is still required before presenting on the target device.

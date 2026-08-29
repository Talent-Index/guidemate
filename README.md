# Guidemate

A consumer marketplace connecting anyone with local experiences: a tourist describes what they
want, an AI agent matches them with a vetted local guide, payment is locked in an on-chain escrow
on Avalanche Fuji, and the guide is paid out to M-Pesa within seconds of the tour being verified
complete. Built for the Avalanche Mini Hack - Nights of Code.

> It's Uber for local experiences: guides list what they offer and their rates, tourists search
> and book directly, funds sit in escrow until the tour is done and confirmed, and the guide's cut
> lands in M-Pesa same-day instead of on a biweekly OTA payout cycle. A secondary B2B path lets
> hotel concierge desks book the same vetted guides on a guest's behalf.

## Monorepo layout

```
contracts/   Foundry project: GuidemateEscrow.sol + MockUSDC.sol, tests, deploy script
backend/     Node/Express API: AI experience matching, chain orchestration, QR signing, M-Pesa sim
frontend/    Next.js app: auth, guide dashboard, tourist marketplace, wallet connect (white/blue brand)
```

Accounts, guide profiles, experience listings and bookings live in Supabase (Postgres + Auth with
Row Level Security). The backend uses a service-role key to orchestrate on-chain escrow calls and
write booking records; everything else (sign up, profile edits, experience CRUD, browsing) talks to
Supabase directly from the frontend under RLS.

## Prerequisites

- Node.js 20+ and npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`) - on Windows,
  install inside WSL since `foundryup` does not support PowerShell/cmd
- A funded Avalanche Fuji testnet wallet - get test AVAX from the
  [Fuji faucet](https://core.app/tools/testnet-faucet/)
- A Supabase project (free tier is fine) - get the project URL, anon/publishable key, and
  service_role key from **Project Settings > API** in the dashboard
- A browser wallet extension (Core Wallet or MetaMask) set to Avalanche Fuji, for the tourist-side
  wallet-connect + testnet mUSDC faucet flow
- (Optional) a free Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
  for AI-based experience matching - without it, matching falls back to a local keyword scorer so
  the demo never breaks

## 1. Install dependencies

```bash
npm install            # installs backend + frontend workspaces
cd contracts && forge install   # already run once; re-run if lib/ is missing
```

## 2. Set up Supabase

Create `profiles`, `experiences` and `bookings` tables with RLS enabled (see
`.cursor/plans/guidemate_consumer_marketplace_cd9e8e03.plan.md` for the exact schema), then:

- In **Authentication > Providers > Email**, turn off "Confirm email" so sign-up sessions are
  usable immediately - important for a smooth demo since there's no custom SMTP configured.
- Copy the project URL + anon key into `frontend/.env.local` and `frontend/.env.example`.
- Copy the project URL + **service_role** key into `backend/.env` (never expose the service_role
  key to the frontend).

## 3. Deploy the contracts (Fuji testnet)

```bash
cd contracts
cp .env.example .env    # fill in FUJI_RPC_URL + BACKEND_PRIVATE_KEY
forge build
forge test
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $FUJI_RPC_URL \
  --broadcast \
  --private-key $BACKEND_PRIVATE_KEY
```

Copy the printed `MockUSDC` and `GuidemateEscrow` addresses into `backend/.env` and
`frontend/.env.local` (`NEXT_PUBLIC_MOCK_USDC_ADDRESS`).

## 4. Configure and run the backend

```bash
cd backend
cp .env.example .env     # fill in BACKEND_PRIVATE_KEY, ESCROW_ADDRESS, MOCK_USDC_ADDRESS,
                          # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY,
                          # WALLET_ENCRYPTION_KEY
npm run seed              # tops up MockUSDC balance + escrow approval, so the demo never runs dry
npm run dev                # http://localhost:4000
```

## 5. Run the frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SUPABASE_URL,
                              # NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_MOCK_USDC_ADDRESS
npm run dev                   # http://localhost:3000
```

## Happy-path demo runbook

1. **Guide onboarding.** Go to `/auth/sign-up`, choose "I'm a guide", sign up with an M-Pesa phone
   number. A custodial payout wallet is provisioned automatically (no MetaMask required). Land on
   `/guide/dashboard` and publish an experience (title, description, tags, price in USDC, duration,
   location). To apply as a vetted guide instead, use `/apply`; approvals happen at `/admin/applications`.
2. **Tourist search.** In another browser/session, sign up as a tourist and land on `/explore`.
   Type a request, e.g. *"I want authentic downtown street food this evening,"* and click **Find my
   guide** - the AI agent matches the best-fit experience with a one-line reason. (Or just browse
   and pick any card directly.)
3. **Book & pay.** Click **Book**, connect a wallet (optional - can also get free testnet mUSDC via
   the faucet button here), then **Confirm & pay** - the backend mints MockUSDC and locks it in
   `GuidemateEscrow` on Fuji. A Snowtrace link appears, and the booking shows up on `/tourist/bookings`.
4. **Tourist ends the trip.** On `/tourist/bookings`, tap **End trip** to reveal a 6-digit PIN and QR.
5. **Guide releases payment.** On `/guide`, enter that PIN (or scan the QR at `/verify`). That calls
   `release()` on-chain, splitting funds 85% guide / 10% hotel-or-protocol / 5% protocol.
6. Back on `/tourist/bookings` and `/guide`, the status flips to **Released** then **Paid**, showing
   the split amounts and a simulated M-Pesa receipt (`KES ... sent to +254... · Ref MPESA-...`).

### Secondary flow: hotel concierge (B2B)

`/concierge` reproduces the original hackathon pitch for a hotel concierge desk booking on a
guest's behalf, reading from the same Supabase-backed experiences. It doesn't require a tourist
account and tags the booking with a demo hotel identity so the 85/10/5 split still shows a
distinct hotel share.

## Local smoke test (no Fuji wallet needed)

The full happy path (match -> book -> lock -> release -> split -> simulated M-Pesa payout) has
been verified end-to-end against a local Foundry `anvil` chain. To reproduce without needing a
funded Fuji wallet:

```bash
# In WSL (Windows) or any Unix shell:
bash contracts/scripts-sh/start-anvil.sh          # starts anvil on :8545, prints its IP
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# (that's anvil's well-known default test account #0 - never use it beyond local testing)
```

Point `backend/.env`'s `FUJI_RPC_URL` at that RPC and `BACKEND_PRIVATE_KEY`/addresses at the
printed values, then `npm run dev` as usual - everything else (AI matching, QR sign/verify,
escrow split, payout simulation) works identically to the Fuji path.

> **Gotcha we hit and fixed:** ethers v6's default provider caches read calls (like the nonce
> lookup) for ~250ms. Two on-chain calls issued back-to-back in the same request (mint, then
> createBooking) could reuse a stale nonce and fail with `NONCE_EXPIRED`. Fixed by constructing
> the provider with `{ cacheTimeout: -1 }` in `backend/src/chain.ts`.

## Design system

White-and-blue, Booking.com-inspired brand: deep-blue `#003B95` top bar and primary actions, white
rounded cards on a light `#F5F7FB` background, and a single amber `#FFB700` CTA reserved for the
key action per screen (Confirm & Pay). Tokens live in `frontend/tailwind.config.ts`; shared
primitives are in `frontend/components/ui/`.

## Notes

- Guide payout wallets are custodial and receive-only: `GuidemateEscrow.release()` transfers USDC
  to the stored address; the guide never signs. The encrypted private key is stored in
  `guide_wallet_keys` (service-role only) under `WALLET_ENCRYPTION_KEY` for future withdrawals -
  there is no withdraw/export UI yet. This is a single-env-var AES-256-GCM setup, not KMS/HSM.
- Instant guide self-signup still works for demos. The public `/apply` waitlist is the vetted path:
  an admin (`profiles.role = 'admin'`) reviews applications at `/admin/applications`, then the
  backend invites the applicant and provisions their wallet. Bootstrap an admin by signing up
  normally and setting `role` to `'admin'` in the Supabase SQL editor - there is no self-serve
  "become admin" path.
- The backend wallet is the trusted signer for the escrow lock/release transactions themselves
  (mint/createBooking/release) - tourist wallets are used for identity, balance display
  and the testnet mUSDC faucet, not for signing the lock/release transactions directly.
- `MockUSDC` is a testnet-only mintable ERC-20 standing in for real USDC/USDT; anyone can self-serve
  a capped amount via its public `faucet()` function.
- Direct tourist bookings (no real hotel) route the "hotel" 10% share to the protocol treasury
  address instead of requiring a hotel wallet.
- M-Pesa payout is simulated (`backend/src/payout.ts`) - no real Daraja/HoneyCoin call is made.
  The KES amount uses a live USDC/USD + USD/KES rate (`GET /api/fx`); `USDC_TO_KES_RATE` is only
  a fallback if the rate providers are unreachable. The nav currency picker converts displayed
  USDC prices the same way.
- Every table (`profiles`, `experiences`, `bookings`) has Row Level Security enabled; the `bookings`
  table has no client-facing write policies at all - every write goes through the backend's
  service-role key so escrow state and DB state can never drift apart.

# Guidemate

A consumer marketplace connecting anyone with local experiences: a tourist describes what they
want, an AI agent matches them with a vetted local guide, payment is locked in an on-chain escrow
on Avalanche Fuji, and the guide is paid out to M-Pesa within seconds of the tour being verified
complete. Built for the Avalanche Mini Hack - Nights of Code.

> It's Uber for local experiences: guides list what they offer and their rates, tourists search
> and book directly, funds sit in escrow until the tourist ends the trip, and the guide's cut
> lands in M-Pesa same-day instead of on a biweekly OTA payout cycle. A secondary B2B path lets
> hotel concierge desks book the same vetted guides on a guest's behalf.

## What's implemented

These are live in the repo today - not a roadmap.

### Marketplace
- Public landing page with explore / apply / waitlist CTAs (`/`)
- Browse and filter experiences by category (`/explore`)
- AI match from a free-text request (Gemini, with a local keyword fallback)
- Book + lock payment in `GuidemateEscrow` (`/book/[id]`)
- Tourist booking list with live escrow status (`/tourist/bookings`)
- Guide dashboard: list experiences, photos, categories, history (`/guide/dashboard`)
- Star ratings after a completed tour
- Direct bookings: tourist pays the listed price; on release 85% guide / 15% Guidemate (the 10% hotel slot routes to the protocol treasury when there is no hotel)

### Escrow and payouts (Avalanche Fuji)

Live contracts on Avalanche Fuji (chain id `43113`). Explorer: [Snowtrace testnet](https://testnet.snowtrace.io).

| Contract | Address | Deploy tx |
|---|---|---|
| `GuidemateEscrow` | [`0x4837EfB8422143fdaa4f60805fC05a21cc9966C0`](https://testnet.snowtrace.io/address/0x4837EfB8422143fdaa4f60805fC05a21cc9966C0) | [`0x148ad6f3…779faa`](https://testnet.snowtrace.io/tx/0x148ad6f395cdfcad5e927a9a197de00d062deb1889f4c00a8ba68d33d6779faa) |
| `MockUSDC` | [`0x76EC76a347115afa9a3490a256bA13447cfBd8c5`](https://testnet.snowtrace.io/address/0x76EC76a347115afa9a3490a256bA13447cfBd8c5) | [`0x8c904142…cc0804`](https://testnet.snowtrace.io/tx/0x8c904142c9bccc56e117fde003278f904776adfec634d7d614d4f8e80ccc0804) |

- Protocol treasury (15% platform cut + 20% no-show fee): [`0x99D12f1b05AE5AaD16cd230760786B3c972C11c0`](https://testnet.snowtrace.io/address/0x99D12f1b05AE5AaD16cd230760786B3c972C11c0). Set on-chain in [`0x08944ddf…74b378`](https://testnet.snowtrace.io/tx/0x08944ddfe85526dc9d7e981fe60eb38b59b07f862442f340fafab58fa874b378).
- Deployer / backend signer: `0x15EaaED3067c06df39CA2062360900b249aF7963`
- Pay → funds sit in the **escrow contract**, not the guide's wallet
- On release: 85% guide custodial wallet / 10% hotel or protocol / 5% protocol
- **End trip** on the tourist phone: 6-digit PIN + QR (`/tourist/bookings`)
- Guide enters the PIN on Active tour (`/guide`) or scans the QR at `/verify`
- Tourist no-show: guide can refund 80% / keep 20% as a fee after a 30-minute grace period
- Simulated M-Pesa receipt after release (no real Daraja call)

### Live FX
- `GET /api/fx` pulls live USDC/USD + fiat rates (cached 15 minutes)
- Nav currency picker shows USDC plus an approximate local amount (KES, EUR, GBP, and 160+ others)
- Simulated KES payouts use the live rate; `USDC_TO_KES_RATE` is only a fallback

### Live streaming
- Guides go live from `/live` (phone camera via LiveKit)
- Viewers join `/live/[streamId]`; paid streams can take a MockUSDC tip
- Optional Egress recording to a `stream-recordings` Supabase bucket
- The directory is empty until a signed-in **guide** starts a stream

### Applications, waitlist, admin
- Apply to be a guide (`/apply`) → `guide_applications`
- Join waitlist (`/waitlist`) → `waitlist`
- Admin dashboard (`/admin/applications`): **Guide applicants** and **Waitlist** tabs
- Approving an applicant invites them and provisions a custodial wallet
- There is no default admin login. Sign up, then in Supabase SQL:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL');
```

### Also shipped
- Email/password auth for tourist, guide, and admin roles
- Custodial guide payout wallets (no MetaMask required for guides)
- Tourist wallet connect + testnet mUSDC faucet
- Hotel concierge demo (`/concierge`)
- Privacy (`/privacy`) and accessibility (`/accessibility`) pages
- Cookie notice toast

## App routes

| Route | Who | What |
|---|---|---|
| `/` | Anyone | Landing |
| `/explore` | Anyone | Browse, filter, AI match |
| `/book/[id]` | Tourist | Confirm & lock escrow |
| `/tourist/bookings` | Tourist | Bookings + **End trip** PIN/QR |
| `/guide` | Guide | Active tour + PIN entry |
| `/guide/dashboard` | Guide | Listings and history |
| `/verify` | Guide (or scanner) | Scan End trip QR |
| `/live` | Anyone / guide | Watch or go live |
| `/apply` | Anyone | Guide application |
| `/waitlist` | Anyone | Platform waitlist |
| `/admin/applications` | Admin | Applicants + waitlist |
| `/auth/sign-in`, `/auth/sign-up` | Anyone | Accounts |
| `/concierge` | Demo | Hotel desk booking |

## Monorepo layout

```
contracts/   Foundry: GuidemateEscrow.sol + MockUSDC.sol, tests, deploy script
backend/     Express: matching, escrow, End trip PIN/QR, FX, streams, admin, M-Pesa sim
frontend/    Next.js: landing, marketplace, live, apply/waitlist, admin dashboard
```

Accounts, listings, applications, waitlist, streams and bookings live in Supabase (Postgres + Auth
with Row Level Security). The backend uses a service-role key for on-chain escrow calls and booking
writes. Sign-up, profile edits, experience CRUD and browsing talk to Supabase from the browser under RLS.

## Prerequisites

- Node.js 20+ and npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`) - on Windows,
  install inside WSL since `foundryup` does not support PowerShell/cmd
- A funded Avalanche Fuji testnet wallet - get test AVAX from the
  [Fuji faucet](https://core.app/tools/testnet-faucet/)
- A Supabase project (free tier is fine) - project URL, anon key, and service_role key from
  **Project Settings > API**
- A browser wallet (Core or MetaMask) on Fuji, for the tourist faucet / optional wallet display
- (Optional) Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) for
  AI matching - otherwise a local keyword scorer is used
- (Optional) [LiveKit Cloud](https://cloud.livekit.io) keys for `/live`

## 1. Install dependencies

```bash
npm install            # installs backend + frontend workspaces
cd contracts && forge install   # already run once; re-run if lib/ is missing
```

## 2. Set up Supabase

Tables in use: `profiles`, `experiences` (with `category`), `bookings`, `ratings`,
`guide_applications`, `waitlist`, `live_streams`, `stream_tips`, `guide_wallet_keys`.
Storage buckets: `guide-proofs`, optional `stream-recordings`.

- In **Authentication > Providers > Email**, turn off "Confirm email" so demo sign-up works
  without custom SMTP.
- Copy the project URL + anon key into `frontend/.env.local`.
- Copy the project URL + **service_role** key into `backend/.env` (never the frontend).

## 3. Deploy the contracts (Fuji testnet)

Fuji addresses already used by this project are listed under **What's implemented**. To redeploy:

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
cp .env.example .env     # chain keys, Supabase service role, WALLET_ENCRYPTION_KEY,
                          # optional GEMINI_API_KEY, optional LiveKit keys
npm run seed              # tops up MockUSDC + escrow approval
npm run dev                # http://localhost:4000
```

## 5. Run the frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SUPABASE_URL,
                              # NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_MOCK_USDC_ADDRESS,
                              # optional NEXT_PUBLIC_LIVEKIT_URL
npm run dev                   # http://localhost:3000
```

## Happy-path demo runbook

1. **Guide onboarding.** `/auth/sign-up` → "I'm a guide" + M-Pesa phone. A custodial payout wallet
   is created. Publish an experience on `/guide/dashboard` (title, category, price in USDC, photo).
   The public vetted path is `/apply`; an admin approves it at `/admin/applications`.
2. **Tourist search.** Sign up as a tourist, open `/explore`. Browse by category or type a request
   such as *"I want authentic downtown street food this evening"* and click **Find my guide**.
3. **Book & pay.** **Confirm & pay** mints MockUSDC and locks it in `GuidemateEscrow`. A Snowtrace
   link appears; the booking shows on `/tourist/bookings`.
4. **End trip.** Tourist taps **End trip** and shows the 6-digit PIN (or QR).
5. **Release.** Guide enters the PIN on `/guide` (or scans the QR at `/verify`). `release()` splits
   85 / 10 / 5 on-chain.
6. Status becomes **Released** then **Paid**, with a simulated M-Pesa receipt
   (`KES ... sent to +254... · Ref MPESA-...`). Tourist can then leave a star rating.

### Other demos

- **Waitlist / apply.** Homepage **Get in early** → `/apply` or `/waitlist`. Admin sees both on
  `/admin/applications` (promote a user to `admin` first - there is no stock password).
- **Live.** Sign in as a guide → `/live` → **Start stream**. Everyone else sees it under Happening now.
- **No-show.** On `/guide`, 30 minutes after booking, **Tourist didn't show up** refunds 80%.
- **Currency.** Use the nav picker to show a live local equivalent next to USDC prices.
- **Concierge.** `/concierge` books on a guest's behalf so the 10% hotel share is distinct.

## Local smoke test (no Fuji wallet needed)

The happy path (match → book → lock → End trip PIN/QR → release → split → simulated M-Pesa) has
been verified against a local Foundry `anvil` chain:

```bash
# In WSL (Windows) or any Unix shell:
bash contracts/scripts-sh/start-anvil.sh          # starts anvil on :8545, prints its IP
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# anvil's well-known default test account #0 - local testing only
```

Point `backend/.env`'s `FUJI_RPC_URL` at that RPC and `BACKEND_PRIVATE_KEY`/addresses at the
printed values, then `npm run dev` as usual.

> **Gotcha we hit and fixed:** ethers v6's default provider caches read calls (like the nonce
> lookup) for ~250ms. Two on-chain calls issued back-to-back in the same request (mint, then
> createBooking) could reuse a stale nonce and fail with `NONCE_EXPIRED`. Fixed by constructing
> the provider with `{ cacheTimeout: -1 }` in `backend/src/chain.ts`.

## Design system

Brand blues `#003B95` / `#00265E`, accent `#0071C2`, amber CTA `#FFB700`. Landing uses a full-bleed
photo hero and mixed light/dark sections; chrome is a sticky/hide-on-scroll nav and a footer pinned
to the viewport bottom. Tokens live in `frontend/tailwind.config.ts`; shared primitives are in
`frontend/components/ui/`.

## Notes

- Guide payout wallets are custodial and receive-only. `GuidemateEscrow.release()` transfers USDC
  to the stored address; the guide never signs. Encrypted keys sit in `guide_wallet_keys`
  (service-role only) under `WALLET_ENCRYPTION_KEY`. There is no withdraw/export UI yet.
- Instant guide self-signup still works for demos. `/apply` is the vetted path; `/waitlist` is for
  people who want access later. An admin reviews both at `/admin/applications`.
- The backend wallet signs lock/release. Tourist wallets are for identity, balance, and the
  testnet mUSDC faucet - they do not sign the escrow transactions.
- `MockUSDC` is testnet-only; anyone can call its public `faucet()`.
- Direct tourist bookings send the 10% "hotel" share to the protocol treasury.
- M-Pesa is simulated in `backend/src/payout.ts`. Live FX is `GET /api/fx`.
- Bookings have no client-facing write policies - every booking write goes through the backend
  service-role key so escrow state and DB state cannot drift apart.

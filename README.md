# Guidemate

Instant M-Pesa payouts for local tour guides, secured by an Avalanche Fuji escrow contract with an
AI-agent-vouched matching engine. Built for the Avalanche Mini Hack - Nights of Code.

> Local guides lose 20-30% of every booking to global OTAs, and get paid on slow biweekly cycles.
> Guidemate locks a hotel's card payment as stablecoin in an on-chain escrow the moment a tour is
> booked, then auto-splits it 85% Guide / 10% Hotel / 5% Protocol and pays the guide out in KES to
> M-Pesa within seconds of a QR-verified tour completion.

## Monorepo layout

```
contracts/   Foundry project: GuidemateEscrow.sol + MockUSDC.sol, tests, deploy script
backend/     Node/Express API: AI guide matching, chain orchestration, QR signing, M-Pesa sim
frontend/    Next.js app: Concierge dashboard, Guide QR view, Verify scanner (white/blue brand)
```

## Prerequisites

- Node.js 20+ and npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`) - on Windows,
  install inside WSL since `foundryup` does not support PowerShell/cmd
- A funded Avalanche Fuji testnet wallet - get test AVAX from the
  [Fuji faucet](https://core.app/tools/testnet-faucet/)
- (Optional) an OpenAI API key for AI-based guide matching - without it, matching falls back to a
  local keyword scorer so the demo never breaks

## 1. Install dependencies

```bash
npm install            # installs backend + frontend workspaces
cd contracts && forge install   # already run once; re-run if lib/ is missing
```

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

## 2. Deploy the contracts (Fuji testnet)

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

Copy the printed `MockUSDC` and `GuidemateEscrow` addresses into `backend/.env`.

## 3. Configure and run the backend

```bash
cd backend
cp .env.example .env     # fill in BACKEND_PRIVATE_KEY, ESCROW_ADDRESS, MOCK_USDC_ADDRESS, OPENAI_API_KEY
npm run seed              # tops up MockUSDC balance + escrow approval, so the demo never runs dry
npm run dev                # http://localhost:4000
```

## 4. Run the frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm run dev                   # http://localhost:3000
```

## Happy-path demo runbook

1. Open `http://localhost:3000/concierge`. Type (or click) a guest request, e.g. *"My guest wants
   authentic downtown street food this evening."*
2. Click **Find a Guide** - the AI agent returns a matched guide card with reputation + reason.
3. Click **Book & Lock Escrow** - the backend mints MockUSDC and locks it in `GuidemateEscrow` on
   Fuji. A Snowtrace link appears; status chip shows **Locked**.
4. Open `http://localhost:3000/guide` (ideally on a second device/window) - the active booking's
   dynamic QR renders automatically.
5. Open `http://localhost:3000/verify` (e.g. scan the QR with a phone camera, which opens this URL
   with the token pre-filled) - this calls `release()` on-chain, splitting funds 85/10/5.
6. Back on the Concierge tab, the status chip flips to **Released** then **Paid**, showing the
   split amounts and a simulated M-Pesa receipt (`KES ... sent to +254... · Ref MPESA-...`).

If the camera scan isn't convenient on stage, paste the token manually into the `/verify` page's
text field - it's the same value encoded in the QR.

## Design system

White-and-blue, Booking.com-inspired brand: deep-blue `#003B95` top bar and primary actions, white
rounded cards on a light `#F5F7FB` background, and a single amber `#FFB700` CTA reserved for the
key action per screen (Book & Lock Escrow). Tokens live in `frontend/tailwind.config.ts`; shared
primitives are in `frontend/components/ui/`.

## Notes

- The backend wallet is the trusted signer for all on-chain calls (mint/createBooking/release) -
  this models "hotel pays by card, Guidemate converts to stablecoin," so concierge/guide/tourist
  never need their own crypto wallets for the MVP.
- `MockUSDC` is a testnet-only mintable ERC-20 standing in for real USDC/USDT.
- M-Pesa payout is simulated (`backend/src/payout.ts`) - no real Daraja/HoneyCoin call is made.

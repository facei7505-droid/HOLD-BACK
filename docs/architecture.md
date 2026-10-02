# Architecture

## System Overview

Holdback is one Anchor program plus thin clients. All money rules live on-chain; the clients only build and sign transactions.

```
┌──────────────────────────┐      ┌───────────────────────────────┐
│ site/ (Vercel)           │      │ app/server.js (local demo)    │
│  • simulation (sim.js)   │      │  • signs for every role       │
│  • devnet mode (Phantom) │      │  • Solana Action / Blink      │
└────────────┬─────────────┘      └───────────────┬───────────────┘
             │ transactions                        │ transactions
             ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ Holdback program  F3qhQqGxVpjDPndPx4KhwoAdvxbmUchQotYFe8zWxARt   │
│                                                                 │
│  Contract PDA ──owns──▶ Vault (associated token account)        │
└─────────────────────────────────────────────────────────────────┘
             │ CPI transfer_checked
             ▼
   SPL Token / Token-2022 program
```

## Accounts

### Contract (PDA)

Seeds: `["contract", client, contract_id (u64 little endian)]`.

| Field | Meaning |
|---|---|
| `client`, `subcontractor`, `arbiter` | The three parties; must be three different wallets |
| `beneficiary` | Who receives the retention on release. Starts as the subcontractor, changes when the claim is sold |
| `mint` | Token used for payments (USDC, KZTE, test token) |
| `retention_bps` | Retention share in basis points, 1 to 2,000 (0.01% to 20%) |
| `warranty_end` | Unix time after which `release` is allowed |
| `arbiter_window_secs` | After `warranty_end + window`, an open defect no longer blocks release (max one year) |
| `total_paid`, `retained`, `frozen`, `paid_out_to_client`, `released` | Running totals |
| `defect_hash` | SHA-256 of the defect evidence (photos, report) |
| `ask_price` | Price of the claim if it is listed for sale, 0 otherwise |
| `status` | `Proposed` → `Active` → `Released` |
| `title` | Up to 64 bytes, for humans |

### Vault

The associated token account of the Contract PDA for the contract's mint. No private key exists for it; only the program can sign transfers out of it, and only in `resolve_defect` (to the client, for a repair) and `release` (to the beneficiary).

## State machine

```
create_contract           accept_contract                 release (after warranty_end)
      │                          │                                 │
      ▼                          ▼                                 ▼
 ┌──────────┐  subcontractor ┌────────┐   anyone, no open defect  ┌──────────┐
 │ Proposed │ ─────────────▶ │ Active │ ────────────────────────▶ │ Released │
 └──────────┘    accepts     └────────┘   (or arbiter window over)└──────────┘
                              │  ▲
              pay_progress    │  │  resolve_defect (arbiter)
              raise_defect ───┘  │  list_claim / buy_claim
                                 └─ any number of times while Active
```

## Money flow

1. `pay_progress(amount)`: `retention = amount × retention_bps / 10,000` goes to the vault, `amount − retention` goes to the subcontractor. Both transfers are in one instruction, so a payment can never be made without the retention landing in the vault.
2. `raise_defect(amount, hash)`: marks `amount` of the vault as frozen. No tokens move.
3. `resolve_defect(pay_client)`: `true` sends the frozen amount to the client for the repair; `false` unfreezes it.
4. `buy_claim`: the buyer pays the seller directly (buyer token account → seller token account) and becomes `beneficiary`. The vault does not move.
5. `release`: the whole vault balance goes to `beneficiary`.

## Security checks

| Check | Where |
|---|---|
| Three distinct parties | `create_contract` (`BadParties`) |
| Subcontractor must accept the terms and arbiter before any payment | `accept_contract`, `pay_progress` requires `Active` |
| Retention 0.01–20%, warranty > 0, arbiter window 1 s to 1 year | `create_contract` |
| Token-2022 mints with fee, hook, delegate, pause or other non-metadata extensions refused | `check_mint_extensions` (`UnsafeMint`) |
| All transfers use `transfer_checked` with the stored mint | `transfer` helper |
| Signer checks via `has_one` (client, arbiter, beneficiary) | account constraints |
| Token accounts bound to mint, owner and token program | `token::` / `associated_token::` constraints |
| Defect only before warranty end, one at a time, not above the unfrozen balance | `raise_defect` |
| Buyer slippage: `max_price` and `min_unfrozen` | `buy_claim` (`PriceChanged`, `VaultChanged`) |
| A silent arbiter cannot lock the vault forever | `release` after `warranty_end + arbiter_window_secs` |
| Checked arithmetic, `u128` for the retention product | `pay_progress` and others |

Full self-review with findings and the checklist before real money: [THREAT-MODEL.md](THREAT-MODEL.md).

## Events

`ContractCreated`, `ContractAccepted`, `ProgressPaid`, `DefectRaised`, `DefectResolved`, `ClaimListed`, `ClaimSold`, `Released`. Indexers and the UI can rebuild a contract's history from these.

## Clients

| Client | Signs with | Network |
|---|---|---|
| `site/demo.html` simulation (`site/sim.js`) | nothing, in-browser model | none |
| `site/demo.html` devnet mode (`site/devnet.js`, built from `app/devnet-client.js`) | Phantom for the client role; throwaway browser keypairs co-sign the other roles | devnet |
| `app/server.js` + `app/public/index.html` | server-held keypairs for every role | local validator or any RPC |
| Blink `/api/actions/release` | any wallet that opens the Action | same as the server |

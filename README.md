# Holdback

**Retention money nobody can sit on.**

In construction, a client keeps 5–10% of every payment "as a warranty" for 1–2 years. That money sits in the client's own account: it gets delayed, spent, or lost when the client goes bankrupt. Holdback is a Solana program that splits every payment in one transaction (95% to the subcontractor, 5% into a vault with no private key), freezes only the cost of a defect, lets the subcontractor sell the locked claim for cash today, and lets **anyone** release the money after the warranty ends.

- Pitch deck: [`deck/holdback-pitch.pdf`](deck/holdback-pitch.pdf) (12 slides)
- Demo video (1:32): [`media/holdback-demo.mp4`](media/holdback-demo.mp4)
- Pitch video (2:04): [`media/holdback-pitch.mp4`](media/holdback-pitch.mp4)
- Scorecard against the evaluation rubric: [`docs/SCORECARD.md`](docs/SCORECARD.md)

## The problem

| Fact | Source |
|---|---|
| Almost £8 bn of cash retentions went unpaid over 3 years in England, mostly SME money | [Gowling WLG, 2025](https://gowlingwlg.com/insights-resources/articles/2025/construction-retentions-explained) |
| 44% of contractors lost retention to an upstream insolvency, £27,300 per contract on average | [Fenwick Elliott](https://www.fenwickelliott.com/knowledge-hub/annual-review/ar-2019/is-it-time-to-release-retention-as-we-know-it/) |
| 43% of US subcontractors wait over 90 days for final payment and retainage; 92% floated payroll | [Siteline / Contractor Mag, 2026](https://www.contractormag.com/management/news/55403190/subcontractors-are-still-financing-their-own-jobs-2026-survey-finds) |
| New Zealand (2023) requires retention in trust on a separate account | [Construction Contracts (Retention Money) Amendment Act 2023](https://www.legislation.govt.nz/act/public/2023/12/en/latest/) |
| The UK decided to ban cash retentions (not before 2027) | [Kennedys](https://www.kennedyslaw.com/en/thought-leadership/article/2025/retentions-in-construction-time-for-reform) |

Not yet verified: how common and how late retention is in Kazakhstan, our first test market.

## How it works

1. `create_contract`: the client opens a contract with a subcontractor and an arbiter, sets the retention % and the warranty end. A vault (ATA owned by the contract PDA) is created.
2. `pay_progress`: one transaction, two transfers: 95% to the subcontractor, 5% into the vault.
3. `raise_defect`: before the warranty ends the client freezes only the cost of a defect (with an evidence hash).
4. `resolve_defect`: the arbiter either pays the frozen amount to the client for the repair or unfreezes it.
5. `list_claim` / `buy_claim`: the claim holder offers the locked retention for sale; a funder pays and becomes the beneficiary in the same transaction.
6. `release`: after the warranty date, with no open defect, **anyone** can send the vault balance to the current beneficiary. Exposed as a Solana Action (Blink) in the demo.

Works with SPL Token and Token-2022 (`token_interface`, `transfer_checked`).

## Repository layout

| Path | What |
|---|---|
| `programs/holdback/src/lib.rs` | Anchor program, 7 instructions |
| `tests/holdback.ts` | 7 tests against a local validator |
| `app/` | Demo server and web UI (role wallets, vault, timer, on-chain log, Blink) |
| `deck/` | Pitch deck (source, HTML, PDF) |
| `media/` | Demo and pitch videos, recording scripts, narration text |
| `docs/SCORECARD.md` | Score against the evaluation rubric and the fastest improvements |
| `target/idl/holdback.json` | Program IDL |

## Run it (Linux)

Requirements: Rust, Solana CLI 2.3 (Agave), Anchor CLI 0.31.1, Node 20+.

```bash
npm install
anchor keys sync                      # generates your own program id
CARGO_RESOLVER_INCOMPATIBLE_RUST_VERSIONS=fallback cargo generate-lockfile
cargo update -p blake3 --precise 1.5.5   # needed for platform-tools with Rust 1.84
(cd programs/holdback && cargo-build-sbf)
anchor idl build -o target/idl/holdback.json -t target/types/holdback.ts

# local network with the program loaded
solana-test-validator --reset \
  --bpf-program $(solana-keygen pubkey target/deploy/holdback-keypair.json) target/deploy/holdback.so

# tests (second terminal)
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json \
  npx ts-mocha -p ./tsconfig.json -t 1000000 tests/holdback.ts

# demo UI on http://localhost:3000
WARRANTY_SECS=55 node app/server.js
```

## Honest limitations

- Runs on a local validator only; not deployed to devnet yet.
- A test token stands in for USDC / KZTE.
- The demo server signs for every role instead of a wallet like Phantom, to show the whole flow on one screen.
- One open defect at a time, one arbiter per contract.
- No security audit. Whether a court would respect the vault in a bankruptcy is untested.
- No customer interviews yet; demand is unproven.

## License

MIT

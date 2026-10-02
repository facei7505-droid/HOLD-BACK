# Threat model and security self-review

**Status: prototype, not audited.** This is a review by the team, not by an independent auditor. Do not put real money into Holdback until a professional audit is done and the open items below are closed.

## Scope and method

- Reviewed: `programs/holdback/src/lib.rs` (all 8 instructions, every account constraint, all arithmetic, signer seeds), the demo server and the Blink.
- Method: read every instruction as an attacker for each role (client, subcontractor, arbiter, funder, stranger), then wrote a test for each finding. 22 tests pass on a local validator (15 earlier, 7 new in `tests/hardening.ts`).
- Not done: fuzzing, formal verification, automated scanners, an external audit, a bug bounty.

## What we protect and from whom

| Asset | Attacker | Wants |
|---|---|---|
| Retention in the vault | Client | Get it back early, or hold it forever |
| Retention in the vault | Subcontractor | Release it despite a real defect |
| Retention in the vault | Arbiter | Take or redirect it |
| Claim buyer's money | Seller or client | Sell a claim worth less than the price |
| Everyone | Whoever controls the program upgrade key | Replace the program and drain vaults |

## Findings

| # | Finding | Severity | Status | Test |
|---|---|---|---|---|
| T1 | **The client picked the arbiter alone.** A client could name its own second wallet as arbiter, freeze the whole retention as a "defect" and pay it to itself. | High | **Fixed.** Contract is created as `Proposed`; the subcontractor must call `accept_contract` (which accepts the arbiter) before any payment. Client, subcontractor and arbiter must be three different wallets. | H1, H2, H3 |
| T2 | **A silent or missing arbiter could lock the vault forever** (an open defect blocked `release` with no deadline). | High | **Fixed.** Each contract has an `arbiter_window_secs` (1 second to 1 year). If a defect is still open after warranty end plus the window, anyone can release and the frozen amount goes to the claim holder. | H4, H5 |
| T3 | **A claim buyer could be cheated by a vault that shrinks** (a defect payout lands in the same block as the purchase). | Medium | **Fixed.** `buy_claim` takes `min_unfrozen`; the sale fails if the unfrozen vault balance is lower. | H6 |
| T4 | **Token-2022 mints with transfer fee, transfer hook, permanent delegate, pause and similar extensions** can make the vault hold less than recorded or block payouts. | Medium | **Fixed.** `create_contract` accepts only plain mints (and metadata-only extensions). | H7 |
| T5 | **Program upgrade authority.** The deployer key can upgrade the program and, because the program signs for every vault, could drain them. "Nobody controls the vault" is true of daily use but not of the code. | High on mainnet, none on devnet | **Open.** Before real funds: move the authority to a multisig with a timelock, or make the program immutable (`solana program set-upgrade-authority --final`). | none |
| T6 | **Stablecoin issuer can freeze accounts** (USDC has a freeze authority). A frozen vault cannot pay out. | Medium | **Accepted and disclosed.** Cannot be fixed in the program; pick the stablecoin knowingly. | none |
| T7 | **The client chooses the frozen amount**, up to everything not yet frozen. A bad-faith client can freeze the whole vault until the arbiter window ends. | Medium | **Partly mitigated** by T2 and the requirement that the subcontractor accepted the arbiter. Open design question: cap one defect at a share of the vault. | none |
| T8 | **Lost claim-holder key.** Release pays the current beneficiary; if that key is lost the money is stuck, and there is no transfer-of-claim instruction other than a sale. | Medium | **Open.** Planned: `transfer_claim` signed by the holder. | none |
| T9 | **Demo server holds all test keys** and signs for every role. | High for the demo only | **Accepted for the prototype.** The wallet flow (Phantom) replaces it; never run it with real funds. | none |
| T10 | **Rounding.** Retention rounds down per payment (under one base unit lost per payment). | Low | Accepted, tested. | existing edge case |
| T11 | **Anyone can send tokens to a vault.** They are released to the claim holder with the rest. | Low | Accepted. | none |
| T12 | **Rent is not reclaimed** after release (contract and vault accounts stay open). | Low | Open, planned `close` after release. | none |
| T13 | **Cluster clock skew** (a few seconds) affects warranty edges. | Low | Accepted. | none |
| T14 | **Blink phishing.** A fake action URL could ask a wallet to sign something else. | Low (the signer risks only a fee here) | Accepted; show the program ID and the transaction preview. | none |
| T15 | **No fee mechanism, no pause switch, no emergency stop.** | Design | Intentional: a pause switch would be a way to control the vault. | none |

## What the tests prove, and what they do not

- They show each fix works on a local validator, with the classic SPL Token program and Token-2022.
- They do **not** show the program is free of other bugs, that it behaves under mainnet load, or that the arbiter process works with real people.

## Before real money (checklist)

1. Independent audit of the program.
2. Upgrade authority moved to a multisig or removed.
3. Legal opinion on the vault and the claim sale ([LEGAL.md](LEGAL.md)).
4. Choose a stablecoin and accept its freeze risk in writing.
5. Arbiter process agreed in the contract text (who, how fast, what evidence).
6. `transfer_claim` and account closing implemented.
7. Bug bounty or at least a public review period.

## Notes on redeploying

The fixes change the program: `create_contract` and `buy_claim` have new arguments, there is a new `accept_contract` instruction, and the account layout gained a field. A program already deployed from the earlier code must be upgraded, and existing test contracts will not be readable by the new version. On devnet that is fine: create new contracts.

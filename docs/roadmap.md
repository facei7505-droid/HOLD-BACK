# Roadmap

## v0.1 — Hackathon MVP (done, Solana Create Shymkent, Oct 2026)
- [x] Anchor program: atomic payment split, partial defect freeze, arbiter, claim market, permissionless release
- [x] SPL Token and Token-2022 support with `transfer_checked`
- [x] Local demo with every role and a Solana Action (Blink) for `release`
- [x] Pitch deck, demo and pitch videos, product site

## v0.2 — Hardening (done)
- [x] Subcontractor must accept the contract and the arbiter
- [x] Arbiter window: a silent arbiter cannot lock the vault forever
- [x] Buyer guard (`min_unfrozen`) on claim sales
- [x] Refuse Token-2022 mints with fee, hook, delegate or pause extensions
- [x] 22 tests, threat model, business, legal and market notes
- [x] Deployed on Solana devnet; web demo signed with Phantom

## v0.3 — Pilot readiness
- [ ] 10+ interviews with subcontractors and developers in Kazakhstan, letters of intent
- [ ] Protocol fee (`fee_bps` on release, capped, to a treasury)
- [ ] Upgrade authority moved to a multisig
- [ ] All roles signed with real wallets (wallet adapter), no server-held keys
- [ ] Devnet USDC and a KZTE extension check
- [ ] Contract list and history view built from on-chain events

## v1.0 — Mainnet
- [ ] Independent security audit
- [ ] Legal opinion on the vault in a bankruptcy (Kazakhstan, then the UK / NZ)
- [ ] Mainnet launch with small amounts for pilot contracts
- [ ] Several open defects and several arbiters per contract

## v2.0 — Growth
- [ ] Funder marketplace for locked claims
- [ ] Optional yield on the vault through a lending protocol (after risk and legal review)
- [ ] Markets with retention reform: UK, New Zealand, Australia, US states
- [ ] Integrations with construction accounting and tender platforms

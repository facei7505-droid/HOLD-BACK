# Security Policy

Holdback is an **unaudited hackathon MVP deployed on Solana devnet only**. Do not use it with real money.

## Reporting a vulnerability

Please report security problems privately through [GitHub Security Advisories](https://github.com/facei7505-droid/HOLD-BACK/security/advisories/new) rather than a public issue. Include the instruction, the accounts involved and, if you can, a failing test or a devnet transaction.

## Scope

- The on-chain program in `programs/holdback/`
- The browser devnet client in `app/devnet-client.js` / `site/devnet.js`

The local demo server (`app/server.js`) signs for every role by design and is not meant to be exposed to the internet.

## Known limitations

The self-review, known risks and the checklist before mainnet are in [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md). In short: no audit yet, the upgrade authority is a single key, and a stablecoin issuer can freeze the vault's token account.

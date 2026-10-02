# Contributing to Holdback

Thank you for your interest in Holdback! The project started at the Solana Create Shymkent bootcamp and is still an unaudited MVP, so issues and small, focused pull requests are very welcome.

## How to Contribute

### Reporting Issues
- Use GitHub Issues for bugs and feature ideas
- Include steps to reproduce, expected and actual behaviour, and the network (local validator or devnet)
- Attach transaction signatures, logs or screenshots where relevant
- **Security problems:** do not open a public issue, see [SECURITY.md](SECURITY.md)

### Submitting Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with clear, conventional commit messages
4. Make sure the program builds and all tests pass (see below)
5. Open a Pull Request against `main` and describe what changes for users

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add protocol fee on release
fix: reject release when the vault mint changed
docs: explain the arbiter window
test: cover buy_claim slippage guard
```

### Development Setup

See [Quick Start](README.md#quick-start). In short:

```bash
npm ci
(cd programs/holdback && cargo-build-sbf)
solana-test-validator --reset --bpf-program F3qhQqGxVpjDPndPx4KhwoAdvxbmUchQotYFe8zWxARt target/deploy/holdback.so
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json npm test
```

CI runs the same steps on every push and pull request.

### Changing the program

- Any change to `programs/holdback/src/lib.rs` needs a test in `tests/` and an updated IDL (`anchor idl build -o target/idl/holdback.json -t target/types/holdback.ts`).
- A program change means a new devnet deployment; the site's devnet client (`npm run build:site`) must match the deployed IDL.
- Keep checked arithmetic, `transfer_checked`, and the account constraints described in [docs/architecture.md](docs/architecture.md#security-checks).

### Changing the site

`site/` is deployed to Vercel from `main` as static files. If you change `app/devnet-client.js`, rebuild `site/devnet.js` with `npm run build:site` and commit both.

## Code of Conduct
Be respectful and constructive. We are building in public on Solana, so let's keep it collaborative.

## Questions?
Open an issue or reach out via [GitHub](https://github.com/facei7505-droid).

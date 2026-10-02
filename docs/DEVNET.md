# Deploying to devnet

The sandbox this project was built in cannot reach Solana devnet, so the program has only run on a local validator. Run this on your own machine (Solana CLI 2.3, Anchor 0.31.1).

```bash
solana config set --url devnet
solana-keygen new -o ~/.config/solana/id.json      # skip if you already have a wallet
solana airdrop 2                                    # repeat; or use https://faucet.solana.com
anchor keys sync
cargo update -p blake3 --precise 1.5.5
(cd programs/holdback && cargo-build-sbf)
solana program deploy target/deploy/holdback.so --program-id target/deploy/holdback-keypair.json
```

Then point the tests and the demo server at devnet:

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json \
  npx ts-mocha -p ./tsconfig.json -t 1000000 tests/holdback.ts
RPC_URL=https://api.devnet.solana.com WARRANTY_SECS=55 node app/server.js
```

Notes: the tests airdrop SOL to their own wallets, which devnet rate-limits; fund the wallets by hand or reduce the airdrop amounts. The program needs about 2.5 SOL of rent for its 337 KB binary.

## Next step for a real wallet

Replace the server-signed roles with Phantom through `@solana/wallet-adapter`: keep `app/server.js` only for the Blink (`/api/actions/release`), and sign `createContract`, `acceptContract` (as the subcontractor), `payProgress`, `raiseDefect`, `listClaim` and `buyClaim` in the browser with the connected wallet. The IDL in `target/idl/holdback.json` is all the client needs.

## Using a real stablecoin instead of the test token

The program takes the mint as an account, so any SPL Token or plain Token-2022 mint works; nothing is hard-coded to the test token. On devnet use Circle's test USDC:

| Item | Value |
|---|---|
| Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (6 decimals; confirm on the Circle faucet page before use) |
| Faucet | https://faucet.circle.com (choose Solana devnet; free test USDC) |

Steps: get devnet SOL, get test USDC for the client wallet (and for a second wallet that plays the funder), then pass that mint to `create_contract`. The subcontractor and funder need a USDC token account (the wallet creates it on first receive, or create it yourself).

What to know:

- USDC is on the classic SPL Token program and has a freeze authority held by Circle. Holdback cannot prevent a freeze; see T6 in [THREAT-MODEL.md](THREAT-MODEL.md).
- Mints that are Token-2022 with fee, hook, delegate or pause extensions are refused by `create_contract` (error `UnsafeMint`). If you plan to use KZTE, check its extensions first; if it uses one on the blocklist, it will be refused until the program is changed on purpose.
- Amounts in the program are base units; the UI must apply the mint's decimals (2 for the test token, 6 for devnet USDC).
- Mainnet needs the checklist in [THREAT-MODEL.md](THREAT-MODEL.md) first. Do not point this at real USDC before then.

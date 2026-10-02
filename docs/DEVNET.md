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

Replace the server-signed roles with Phantom through `@solana/wallet-adapter`: keep `app/server.js` only for the Blink (`/api/actions/release`), and sign `createContract`, `payProgress`, `raiseDefect`, `listClaim` and `buyClaim` in the browser with the connected wallet. The IDL in `target/idl/holdback.json` is all the client needs.

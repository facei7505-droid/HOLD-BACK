# API Reference

## Program instructions

Program id: `F3qhQqGxVpjDPndPx4KhwoAdvxbmUchQotYFe8zWxARt` (devnet). The full interface is in [`target/idl/holdback.json`](../target/idl/holdback.json); TypeScript types in [`target/types/holdback.ts`](../target/types/holdback.ts). Amounts are in the mint's base units.

| Instruction | Signer | Arguments | Effect |
|---|---|---|---|
| `create_contract` | client | `contract_id: u64`, `retention_bps: u16`, `warranty_secs: i64`, `arbiter_window_secs: i64`, `title: string` | Creates the Contract PDA and its vault, status `Proposed` |
| `accept_contract` | subcontractor | none | `Proposed` → `Active` |
| `pay_progress` | client | `amount: u64` | Splits `amount`: retention to the vault, the rest to the subcontractor |
| `raise_defect` | client | `amount: u64`, `evidence_hash: [u8; 32]` | Freezes `amount` of the vault (before warranty end, one defect at a time) |
| `resolve_defect` | arbiter | `pay_client: bool` | Pays the frozen amount to the client, or unfreezes it |
| `list_claim` | beneficiary | `price: u64` | Offers the claim for sale; `0` removes the offer |
| `buy_claim` | buyer | `max_price: u64`, `min_unfrozen: u64` | Pays the seller and becomes beneficiary in one transaction |
| `release` | anyone | none | After the warranty, sends the whole vault to the beneficiary |

### Example (TypeScript, Anchor)

```ts
const [contract] = PublicKey.findProgramAddressSync(
  [Buffer.from("contract"), client.publicKey.toBuffer(), new BN(id).toArrayLike(Buffer, "le", 8)],
  program.programId,
);

await program.methods
  .createContract(new BN(id), 500, new BN(2 * 365 * 86400), new BN(30 * 86400), "Block B electrical")
  .accounts({ client: client.publicKey, subcontractor: sub.publicKey, arbiter: arbiter.publicKey, mint, tokenProgram })
  .signers([client])
  .rpc();

await program.methods.acceptContract().accounts({ subcontractor: sub.publicKey, contract }).signers([sub]).rpc();
await program.methods.payProgress(new BN(1_000_000)).accounts({ client: client.publicKey, contract, mint, clientToken, subcontractorToken, tokenProgram }).signers([client]).rpc();
```

The tests in [`tests/`](../tests/) show every instruction, including failure cases.

### Errors

| Code | Meaning |
|---|---|
| `BadRetention` | Retention must be between 0.01% and 20% |
| `BadWarranty` | Warranty period must be positive |
| `TitleTooLong` | Title is longer than 64 bytes |
| `ZeroAmount` | Amount must be greater than zero |
| `Overflow` | Arithmetic overflow |
| `NotActive` | Contract is not active (not accepted yet, or already released) |
| `WarrantyOver` | Warranty period is already over |
| `WarrantyNotOver` | Warranty period is not over yet |
| `DefectOpen` | A defect is already open, or still blocks release |
| `NoDefect` | No open defect to resolve |
| `BadDefectAmount` | Defect amount is zero or above the unfrozen retention |
| `NotForSale` | Claim is not listed |
| `PriceChanged` | Ask price is above the buyer's `max_price` |
| `AlreadyOwner` | Buyer already owns the claim |
| `BadParties` | Client, subcontractor and arbiter must be three different wallets |
| `BadArbiterWindow` | Arbiter window must be positive and at most one year |
| `NotProposed` | Contract was already accepted |
| `VaultChanged` | The vault holds less unfrozen money than the buyer expected |
| `UnsafeMint` | Token-2022 mint with extensions that can break the vault |

## Demo server HTTP endpoints

`app/server.js`, default `http://localhost:3000`. It holds a keypair for every role and is for demos only.

| Method | Path | What |
|---|---|---|
| GET | `/` | Demo UI |
| GET | `/api/state` | Contract, vault and wallet balances, event log |
| POST | `/api/do/<action>` | Runs one demo step as the right role (see `actions` in `server.js`) |
| GET | `/actions.json` | Solana Actions rules file |
| GET | `/api/actions/release` | Action metadata for the "Release funds" Blink |
| POST | `/api/actions/release` | Body `{ "account": "<wallet>" }`, returns an unsigned `release` transaction (base64) |
| POST | `/api/wallet/sign-and-send` | Demo wallet: signs an Action transaction as a role and sends it |

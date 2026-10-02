import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { Holdback } from "../target/types/holdback";

// Tests for the findings of the security self-review (docs/THREAT-MODEL.md).
describe("holdback hardening", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Holdback as Program<Holdback>;
  const conn = provider.connection;
  const tp = TOKEN_PROGRAM_ID;
  const client = Keypair.generate();
  const sub = Keypair.generate();
  const arbiter = Keypair.generate();
  const funder = Keypair.generate();
  let mint: PublicKey;
  let next = 500;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const ata = (o: PublicKey) => getAssociatedTokenAddressSync(mint, o, true, tp);
  const bal = async (o: PublicKey) => Number((await getAccount(conn, ata(o), undefined, tp)).amount);
  const pda = (id: BN) =>
    PublicKey.findProgramAddressSync([Buffer.from("contract"), client.publicKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)], program.programId)[0];
  async function expectFail(p: Promise<unknown>, needle: RegExp) {
    try { await p; } catch (e: any) { expect(String(e)).to.match(needle); return; }
    expect.fail("expected the transaction to fail");
  }
  const create = (id: BN, o: { sub?: PublicKey; arbiter?: PublicKey; warranty?: number; window?: number; mint?: PublicKey; tp?: PublicKey } = {}) =>
    program.methods
      .createContract(id, 500, new BN(o.warranty ?? 3600), new BN(o.window ?? 3600), "hardening")
      .accounts({
        client: client.publicKey,
        subcontractor: o.sub ?? sub.publicKey,
        arbiter: o.arbiter ?? arbiter.publicKey,
        mint: o.mint ?? mint,
        tokenProgram: o.tp ?? tp,
      })
      .signers([client])
      .rpc();
  const accept = (c: PublicKey, who: Keypair = sub) => program.methods.acceptContract().accounts({ subcontractor: who.publicKey, contract: c }).signers([who]).rpc();
  async function open(warranty = 3600, window = 3600) {
    const id = new BN(next++);
    await create(id, { warranty, window });
    const c = pda(id);
    await accept(c);
    return c;
  }
  const pay = (contract: PublicKey, amount: number) =>
    program.methods
      .payProgress(new BN(amount))
      .accounts({ client: client.publicKey, contract, mint, clientToken: ata(client.publicKey), subcontractorToken: ata(sub.publicKey), tokenProgram: tp })
      .signers([client])
      .rpc();
  const release = (c: PublicKey) =>
    program.methods.release().accounts({ caller: funder.publicKey, contract: c, mint, beneficiaryToken: ata(sub.publicKey), tokenProgram: tp }).signers([funder]).rpc();
  const defect = (c: PublicKey, amount: number) =>
    program.methods.raiseDefect(new BN(amount), Array.from(Buffer.alloc(32, 9))).accounts({ client: client.publicKey, contract: c }).signers([client]).rpc();

  before(async () => {
    for (const kp of [client, sub, arbiter, funder]) {
      await conn.confirmTransaction(await conn.requestAirdrop(kp.publicKey, 10 * LAMPORTS_PER_SOL), "confirmed");
    }
    mint = await createMint(conn, client, client.publicKey, null, 2, undefined, undefined, tp);
    for (const kp of [client, sub, arbiter, funder]) await getOrCreateAssociatedTokenAccount(conn, client, mint, kp.publicKey, false, undefined, undefined, tp);
    await mintTo(conn, client, mint, ata(client.publicKey), client, 1_000_000_00, [], undefined, tp);
    await mintTo(conn, client, mint, ata(funder.publicKey), client, 1_000_000_00, [], undefined, tp);
  });

  it("H1: the three roles must be different wallets", async () => {
    await expectFail(create(new BN(next++), { arbiter: client.publicKey }), /BadParties/);
    await expectFail(create(new BN(next++), { arbiter: sub.publicKey }), /BadParties/);
    await expectFail(create(new BN(next++), { sub: client.publicKey }), /BadParties/);
  });

  it("H2: no payment, release or defect before the subcontractor accepts; only they can accept, once", async () => {
    const id = new BN(next++);
    await create(id, { warranty: 3 });
    const c = pda(id);
    await expectFail(pay(c, 1000), /NotActive/);
    await expectFail(defect(c, 1), /NotActive/);
    await expectFail(accept(c, client), /has_one|ConstraintHasOne|2001/);
    await accept(c);
    await expectFail(accept(c), /NotProposed/);
    await pay(c, 1000);
  });

  it("H3: a late acceptance after the warranty has ended is rejected", async () => {
    const id = new BN(next++);
    await create(id, { warranty: 2 });
    await sleep(3000);
    await expectFail(accept(pda(id)), /WarrantyOver/);
  });

  it("H4: the arbiter window must be positive and at most one year", async () => {
    await expectFail(create(new BN(next++), { window: 0 }), /BadArbiterWindow/);
    await expectFail(create(new BN(next++), { window: 365 * 24 * 3600 + 1 }), /BadArbiterWindow/);
  });

  it("H5: a silent arbiter cannot lock the vault forever", async () => {
    const c = await open(3, 5); // warranty 3 s, arbiter window 5 s
    await pay(c, 10_000); // retention 500
    await defect(c, 200);
    await sleep(4000); // warranty over, window still open
    await expectFail(release(c), /DefectOpen/);
    await sleep(5000); // window over
    const before = await bal(sub.publicKey);
    await release(c);
    expect((await bal(sub.publicKey)) - before).to.eq(500); // including the frozen 200
    const k = await program.account.contract.fetch(c);
    expect(k.frozen.toNumber()).to.eq(0);
    expect(k.status).to.have.property("released");
  });

  it("H6: a buyer is protected against the vault shrinking before the sale lands", async () => {
    const c = await open();
    await pay(c, 10_000); // vault 500
    await program.methods.listClaim(new BN(450)).accounts({ beneficiary: sub.publicKey, contract: c }).signers([sub]).rpc();
    await defect(c, 200); // unfrozen money is now 300
    const buy = (minUnfrozen: number) =>
      program.methods
        .buyClaim(new BN(450), new BN(minUnfrozen))
        .accounts({ buyer: funder.publicKey, contract: c, mint, buyerToken: ata(funder.publicKey), sellerToken: ata(sub.publicKey), tokenProgram: tp })
        .signers([funder])
        .rpc();
    await expectFail(buy(400), /VaultChanged/);
    await buy(300);
    expect((await program.account.contract.fetch(c)).beneficiary.toBase58()).to.eq(funder.publicKey.toBase58());
  });

  it("H7: a Token-2022 mint with a transfer fee is refused, a plain one is accepted", async () => {
    const tp22 = TOKEN_2022_PROGRAM_ID;
    const feeMint = Keypair.generate();
    const len = getMintLen([ExtensionType.TransferFeeConfig]);
    const rent = await conn.getMinimumBalanceForRentExemption(len);
    const tx = new Transaction().add(
      SystemProgram.createAccount({ fromPubkey: client.publicKey, newAccountPubkey: feeMint.publicKey, space: len, lamports: rent, programId: tp22 }),
      createInitializeTransferFeeConfigInstruction(feeMint.publicKey, client.publicKey, client.publicKey, 100, BigInt(1_000_000), tp22),
      createInitializeMintInstruction(feeMint.publicKey, 2, client.publicKey, null, tp22)
    );
    await sendAndConfirmTransaction(conn, tx, [client, feeMint]);
    await expectFail(create(new BN(next++), { mint: feeMint.publicKey, tp: tp22 }), /UnsafeMint/);

    const plain = await createMint(conn, client, client.publicKey, null, 2, undefined, undefined, tp22);
    await create(new BN(next++), { mint: plain, tp: tp22 });
  });
});

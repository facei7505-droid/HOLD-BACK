import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { Holdback } from "../target/types/holdback";

// Edge cases and the classic SPL Token program (the main suite uses Token-2022).
describe("holdback edge cases", () => {
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
  let next = 100;
  const ata = (o: PublicKey) => getAssociatedTokenAddressSync(mint, o, true, tp);
  const bal = async (o: PublicKey) => Number((await getAccount(conn, ata(o), undefined, tp)).amount);
  const pda = (id: BN) =>
    PublicKey.findProgramAddressSync([Buffer.from("contract"), client.publicKey.toBuffer(), id.toArrayLike(Buffer, "le", 8)], program.programId)[0];

  async function open(bps = 500, warranty = 3600, window = 3600) {
    const id = new BN(next++);
    await program.methods
      .createContract(id, bps, new BN(warranty), new BN(window), "edge case")
      .accounts({ client: client.publicKey, subcontractor: sub.publicKey, arbiter: arbiter.publicKey, mint, tokenProgram: tp })
      .signers([client])
      .rpc();
    const c = pda(id);
    await program.methods.acceptContract().accounts({ subcontractor: sub.publicKey, contract: c }).signers([sub]).rpc();
    return c;
  }
  const pay = (contract: PublicKey, amount: number) =>
    program.methods
      .payProgress(new BN(amount))
      .accounts({ client: client.publicKey, contract, mint, clientToken: ata(client.publicKey), subcontractorToken: ata(sub.publicKey), tokenProgram: tp })
      .signers([client])
      .rpc();
  async function expectFail(p: Promise<unknown>, needle: RegExp) {
    try { await p; } catch (e: any) { expect(String(e)).to.match(needle); return; }
    expect.fail("expected the transaction to fail");
  }

  before(async () => {
    for (const kp of [client, sub, arbiter, funder]) {
      await conn.confirmTransaction(await conn.requestAirdrop(kp.publicKey, 10 * LAMPORTS_PER_SOL), "confirmed");
    }
    mint = await createMint(conn, client, client.publicKey, null, 2, undefined, undefined, tp);
    for (const kp of [client, sub, arbiter, funder]) await getOrCreateAssociatedTokenAccount(conn, client, mint, kp.publicKey, false, undefined, undefined, tp);
    await mintTo(conn, client, mint, ata(client.publicKey), client, 1_000_000_00, [], undefined, tp);
    await mintTo(conn, client, mint, ata(funder.publicKey), client, 1_000_000_00, [], undefined, tp);
  });

  it("works with the classic SPL Token program and rounds the retention down", async () => {
    const c = await open(500);
    await pay(c, 999); // 5% of 999 = 49.95 -> 49 into the vault
    expect(await bal(c)).to.eq(49);
    const k = await program.account.contract.fetch(c);
    expect(k.retained.toNumber()).to.eq(49);
    expect(k.totalPaid.toNumber()).to.eq(999);
  });

  it("rejects retention above 20% and a zero warranty", async () => {
    await expectFail(open(2001), /BadRetention/);
    await expectFail(open(0), /BadRetention/);
    await expectFail(open(500, 0), /BadWarranty/);
  });

  it("rejects a zero payment", async () => {
    const c = await open();
    await expectFail(pay(c, 0), /ZeroAmount/);
  });

  it("rejects a defect larger than the locked retention and a second open defect", async () => {
    const c = await open();
    await pay(c, 10_000); // retention 500
    const h = Array.from(Buffer.alloc(32, 1));
    await expectFail(program.methods.raiseDefect(new BN(501), h).accounts({ client: client.publicKey, contract: c }).signers([client]).rpc(), /BadDefectAmount/);
    await program.methods.raiseDefect(new BN(200), h).accounts({ client: client.publicKey, contract: c }).signers([client]).rpc();
    await expectFail(program.methods.raiseDefect(new BN(100), h).accounts({ client: client.publicKey, contract: c }).signers([client]).rpc(), /DefectOpen/);
  });

  it("only the client can report a defect", async () => {
    const c = await open();
    await pay(c, 10_000);
    const h = Array.from(Buffer.alloc(32, 2));
    await expectFail(program.methods.raiseDefect(new BN(100), h).accounts({ client: sub.publicKey, contract: c }).signers([sub]).rpc(), /has_one|ConstraintHasOne|2001/);
  });

  it("resolving with 'no defect' unfreezes the amount", async () => {
    const c = await open();
    await pay(c, 10_000);
    const h = Array.from(Buffer.alloc(32, 3));
    await program.methods.raiseDefect(new BN(300), h).accounts({ client: client.publicKey, contract: c }).signers([client]).rpc();
    const before = await bal(client.publicKey);
    await program.methods
      .resolveDefect(false)
      .accounts({ arbiter: arbiter.publicKey, contract: c, mint, clientToken: ata(client.publicKey), tokenProgram: tp })
      .signers([arbiter])
      .rpc();
    expect(await bal(client.publicKey)).to.eq(before);
    expect((await program.account.contract.fetch(c)).frozen.toNumber()).to.eq(0);
    await expectFail(
      program.methods.resolveDefect(true).accounts({ arbiter: arbiter.publicKey, contract: c, mint, clientToken: ata(client.publicKey), tokenProgram: tp }).signers([arbiter]).rpc(),
      /NoDefect/
    );
  });

  it("a claim cannot be bought when it is not for sale or when the price went up", async () => {
    const c = await open();
    await pay(c, 10_000);
    const buy = (max: number) =>
      program.methods.buyClaim(new BN(max), new BN(0)).accounts({ buyer: funder.publicKey, contract: c, mint, buyerToken: ata(funder.publicKey), sellerToken: ata(sub.publicKey), tokenProgram: tp }).signers([funder]).rpc();
    await expectFail(buy(1000), /NotForSale/);
    await program.methods.listClaim(new BN(450)).accounts({ beneficiary: sub.publicKey, contract: c }).signers([sub]).rpc();
    await expectFail(buy(400), /PriceChanged/);
    await buy(450);
    // the old holder can no longer list or change the price
    await expectFail(program.methods.listClaim(new BN(1)).accounts({ beneficiary: sub.publicKey, contract: c }).signers([sub]).rpc(), /has_one|ConstraintHasOne|2001/);
  });

  it("an open defect blocks the release until it is settled", async () => {
    const c = await open(500, 3);
    await pay(c, 10_000);
    const h = Array.from(Buffer.alloc(32, 4));
    await program.methods.raiseDefect(new BN(100), h).accounts({ client: client.publicKey, contract: c }).signers([client]).rpc();
    await new Promise((r) => setTimeout(r, 4500));
    const rel = () => program.methods.release().accounts({ caller: funder.publicKey, contract: c, mint, beneficiaryToken: ata(sub.publicKey), tokenProgram: tp }).signers([funder]).rpc();
    await expectFail(rel(), /DefectOpen/);
    await program.methods.resolveDefect(false).accounts({ arbiter: arbiter.publicKey, contract: c, mint, clientToken: ata(client.publicKey), tokenProgram: tp }).signers([arbiter]).rpc();
    const before = await bal(sub.publicKey);
    await rel();
    expect((await bal(sub.publicKey)) - before).to.eq(500);
    expect(await bal(c)).to.eq(0);
  });
});

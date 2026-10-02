import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { Holdback } from "../target/types/holdback";

const KZT = (n: number) => new BN(n * 100); // test USDC with 2 decimals
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("holdback", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Holdback as Program<Holdback>;
  const conn = provider.connection;
  const tp = TOKEN_2022_PROGRAM_ID;

  const client = Keypair.generate(); // developer / general contractor
  const sub = Keypair.generate(); // electricians
  const arbiter = Keypair.generate(); // independent technical supervisor
  const funder = Keypair.generate(); // buys the locked claim
  const stranger = Keypair.generate(); // anyone in the audience

  let mint: PublicKey;
  const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(mint, owner, true, tp);
  const balance = async (owner: PublicKey) => Number((await getAccount(conn, ata(owner), undefined, tp)).amount) / 100;

  const contractId = new BN(1);
  let contract: PublicKey;
  let vault: PublicKey;

  before(async () => {
    for (const kp of [client, sub, arbiter, funder, stranger]) {
      const sig = await conn.requestAirdrop(kp.publicKey, 10 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
    }
    mint = await createMint(conn, client, client.publicKey, null, 2, undefined, undefined, tp);
    for (const kp of [client, sub, arbiter, funder, stranger]) {
      await getOrCreateAssociatedTokenAccount(conn, client, mint, kp.publicKey, false, undefined, undefined, tp);
    }
    await mintTo(conn, client, mint, ata(client.publicKey), client, 100_000_000 * 100, [], undefined, tp);
    await mintTo(conn, client, mint, ata(funder.publicKey), client, 10_000_000 * 100, [], undefined, tp);

    [contract] = PublicKey.findProgramAddressSync(
      [Buffer.from("contract"), client.publicKey.toBuffer(), contractId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    vault = ata(contract);
  });

  it("creates a contract with 5% retention", async () => {
    await program.methods
      .createContract(contractId, 500, new BN(8), "Turan Residences, electrical, block B")
      .accounts({
        client: client.publicKey,
        subcontractor: sub.publicKey,
        arbiter: arbiter.publicKey,
        mint,
        tokenProgram: tp,
      })
      .signers([client])
      .rpc();
    const c = await program.account.contract.fetch(contract);
    expect(c.retentionBps).to.eq(500);
    expect(c.beneficiary.toBase58()).to.eq(sub.publicKey.toBase58());
  });

  it("splits every progress payment atomically: 95% to sub, 5% to the vault", async () => {
    for (const amount of [5_000_000, 5_000_000, 10_000_000]) {
      await program.methods
        .payProgress(KZT(amount))
        .accounts({
          client: client.publicKey,
          contract,
          mint,
          clientToken: ata(client.publicKey),
          subcontractorToken: ata(sub.publicKey),
          tokenProgram: tp,
        })
        .signers([client])
        .rpc();
    }
    expect(await balance(sub.publicKey)).to.eq(19_000_000);
    expect(Number((await getAccount(conn, vault, undefined, tp)).amount) / 100).to.eq(1_000_000);
  });

  it("nobody can take the retention before the warranty ends", async () => {
    try {
      await program.methods
        .release()
        .accounts({ caller: client.publicKey, contract, mint, beneficiaryToken: ata(sub.publicKey), tokenProgram: tp })
        .signers([client])
        .rpc();
      expect.fail("release should fail");
    } catch (e: any) {
      expect(String(e)).to.contain("WarrantyNotOver");
    }
  });

  it("a defect freezes only its own cost; only the arbiter settles it", async () => {
    const evidence = Array.from(Buffer.alloc(32, 7));
    await program.methods
      .raiseDefect(KZT(50_000), evidence)
      .accounts({ client: client.publicKey, contract })
      .signers([client])
      .rpc();
    let c = await program.account.contract.fetch(contract);
    expect(c.frozen.toNumber() / 100).to.eq(50_000);

    try {
      await program.methods
        .resolveDefect(true)
        .accounts({ arbiter: client.publicKey, contract, mint, clientToken: ata(client.publicKey), tokenProgram: tp })
        .signers([client])
        .rpc();
      expect.fail("client must not settle his own claim");
    } catch (e: any) {
      expect(String(e)).to.match(/has_one|ConstraintHasOne|2001/);
    }

    const before = await balance(client.publicKey);
    await program.methods
      .resolveDefect(true)
      .accounts({ arbiter: arbiter.publicKey, contract, mint, clientToken: ata(client.publicKey), tokenProgram: tp })
      .signers([arbiter])
      .rpc();
    expect((await balance(client.publicKey)) - before).to.eq(50_000);
    c = await program.account.contract.fetch(contract);
    expect(c.frozen.toNumber()).to.eq(0);
  });

  it("the subcontractor sells the locked claim to a funder in one atomic swap", async () => {
    await program.methods
      .listClaim(KZT(900_000))
      .accounts({ beneficiary: sub.publicKey, contract })
      .signers([sub])
      .rpc();
    const subBefore = await balance(sub.publicKey);
    await program.methods
      .buyClaim(KZT(900_000))
      .accounts({
        buyer: funder.publicKey,
        contract,
        mint,
        buyerToken: ata(funder.publicKey),
        sellerToken: ata(sub.publicKey),
        tokenProgram: tp,
      })
      .signers([funder])
      .rpc();
    expect((await balance(sub.publicKey)) - subBefore).to.eq(900_000);
    const c = await program.account.contract.fetch(contract);
    expect(c.beneficiary.toBase58()).to.eq(funder.publicKey.toBase58());
  });

  it("after the warranty anyone can release, money goes to the claim holder", async () => {
    await sleep(9_000);
    const before = await balance(funder.publicKey);
    await program.methods
      .release()
      .accounts({ caller: stranger.publicKey, contract, mint, beneficiaryToken: ata(funder.publicKey), tokenProgram: tp })
      .signers([stranger])
      .rpc();
    expect((await balance(funder.publicKey)) - before).to.eq(950_000);
    const c = await program.account.contract.fetch(contract);
    expect(c.status).to.have.property("released");
  });

  it("cannot be released twice", async () => {
    try {
      await program.methods
        .release()
        .accounts({ caller: stranger.publicKey, contract, mint, beneficiaryToken: ata(funder.publicKey), tokenProgram: tp })
        .signers([stranger])
        .rpc();
      expect.fail("second release should fail");
    } catch (e: any) {
      expect(String(e)).to.contain("NotActive");
    }
  });
});

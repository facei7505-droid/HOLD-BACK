// Browser client for the Holdback program on Solana devnet, signed with Phantom.
// Bundled into site/devnet.js by `npm run build:site`. It exposes the same
// api(path, body) shape as the in-page simulation, so the demo UI is shared.
//
// The connected Phantom wallet is the developer and pays every fee and rent.
// The other roles (subcontractor, arbiter, funder, stranger) are throwaway
// keypairs created in the browser: they hold no SOL and only co-sign.
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, VersionedTransaction, LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID, getMintLen, getAssociatedTokenAddressSync,
  createInitializeMint2Instruction, createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction,
} from "@solana/spl-token";
import idl from "../target/idl/holdback.json";

const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(idl.address);
const TP = TOKEN_2022_PROGRAM_ID;
const DEC = 100; // test USDC with 2 decimals, same as the tests
const WARRANTY_SECS = 45;
const ARBITER_WINDOW_SECS = 60; // after this, an unsettled defect no longer blocks release
const TITLE = "Turan Residences, electrical, block B";
const names = { client: "Developer: your Phantom wallet", sub: "Subcontractor: Volt Electric", arbiter: "Arbiter: site inspector", funder: "Funder / lender", stranger: "Anyone (a stranger)" };
const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
const explorer = (kind, id) => `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

const conn = new Connection(RPC, "confirmed");
let wallet, me, program, st;

const phantom = () => (window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom ? window.solana : null);
const storeKey = () => "holdback-devnet-" + me.toBase58();
const kp = (s) => Keypair.fromSecretKey(Uint8Array.from(s));

function fresh() {
  const k = {};
  for (const r of ["sub", "arbiter", "funder", "stranger"]) k[r] = Array.from(Keypair.generate().secretKey);
  return { keys: k, mint: null, contractId: String(Date.now()), log: [] };
}
function save() { try { localStorage.setItem(storeKey(), JSON.stringify(st)); } catch {} }
function load() {
  try { const s = JSON.parse(localStorage.getItem(storeKey())); if (s && s.keys) return s; } catch {}
  return fresh();
}

const pub = (role) => (role === "client" ? me : kp(st.keys[role]).publicKey);
const signer = (role) => kp(st.keys[role]);
const mint = () => new PublicKey(st.mint);
const ata = (owner) => getAssociatedTokenAddressSync(mint(), owner, true, TP);
const contractPda = () => PublicKey.findProgramAddressSync(
  [Buffer.from("contract"), me.toBuffer(), new BN(st.contractId).toArrayLike(Buffer, "le", 8)], PROGRAM_ID)[0];
const roleOf = (pk) => Object.keys(names).find((r) => pub(r).equals(pk)) || pk.toBase58();

function programError(logs, err) {
  const line = (logs || []).find((l) => l.includes("Error Message:"));
  if (line) return line.split("Error Message:")[1].trim().replace(/\.$/, "");
  if ((logs || []).some((l) => l.includes("insufficient"))) return "insufficient funds";
  return typeof err === "string" ? err : JSON.stringify(err);
}

// Simulate first so a rule violation shows up without a Phantom popup,
// then ask Phantom to sign as fee payer and send to devnet.
async function send(ixs, signers, role, action) {
  return sendGroups([{ ixs, signers, role, action }]);
}

// Packs instruction groups into as few transactions as fit the size limit
// (each one is a separate Phantom approval) and sends them in order.
async function sendGroups(groups) {
  const fits = (g) => {
    const tx = new Transaction().add(...g.flatMap((x) => x.ixs));
    tx.feePayer = me; tx.recentBlockhash = PublicKey.default.toBase58();
    try { tx.serialize({ requireAllSignatures: false, verifySignatures: false }); return true; } catch { return false; }
  };
  const batches = [];
  for (const g of groups) {
    const lastB = batches[batches.length - 1];
    if (lastB && fits([...lastB, g])) lastB.push(g); else batches.push([g]);
  }
  let r;
  for (const b of batches) {
    const acts = b.map((x) => x.action).filter(Boolean);
    r = await sendOne(b.flatMap((x) => x.ixs), b.flatMap((x) => x.signers), b[b.length - 1].role, acts.join("; "));
  }
  return r;
}

async function sendOne(ixs, signers, role, action) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = me;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  const sim = await conn.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) throw new Error(programError(sim.value.logs, sim.value.err));
  if (signers.length) tx.partialSign(...signers);
  const signed = await wallet.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  const fee = 5000 * tx.signatures.length;
  st.log.unshift({ t: Date.now(), role: names[role] || role, action, sig, fee, url: explorer("tx", sig) });
  save();
  return { sig };
}

async function fetchContract() {
  if (!st.mint) return null;
  return program.account.contract.fetchNullable(contractPda());
}
async function tokenBalance(owner) {
  try { const b = await conn.getTokenAccountBalance(ata(owner)); return Number(b.value.amount) / DEC; } catch { return 0; }
}

const actions = {
  async create() {
    const existing = await fetchContract();
    if (existing && existing.status.active) throw new Error("a contract is already open, reset to start over");
    if (existing && existing.status.proposed) return accept();
    if (existing) { st.contractId = String(Date.now()); save(); }
    const ixs = [], signers = [];
    const fundsNewMint = !st.mint;
    if (!st.mint) {
      const m = Keypair.generate();
      st.mint = m.publicKey.toBase58();
      const len = getMintLen([]);
      ixs.push(
        SystemProgram.createAccount({ fromPubkey: me, newAccountPubkey: m.publicKey, space: len, lamports: await conn.getMinimumBalanceForRentExemption(len), programId: TP }),
        createInitializeMint2Instruction(m.publicKey, 2, me, null, TP),
      );
      for (const r of ["client", "sub", "funder"]) ixs.push(createAssociatedTokenAccountIdempotentInstruction(me, ata(pub(r)), pub(r), m.publicKey, TP));
      ixs.push(
        createMintToInstruction(m.publicKey, ata(me), me, 1_000_000 * DEC, [], TP),
        createMintToInstruction(m.publicKey, ata(pub("funder")), me, 200_000 * DEC, [], TP),
      );
      signers.push(m);
    }
    const createIx = await program.methods
      .createContract(new BN(st.contractId), 500, new BN(WARRANTY_SECS), new BN(ARBITER_WINDOW_SECS), TITLE)
      .accountsPartial({ client: me, subcontractor: pub("sub"), arbiter: pub("arbiter"), mint: mint(), contract: contractPda(), vault: ata(contractPda()), tokenProgram: TP })
      .instruction();
    try {
      return await sendGroups([
        ...(ixs.length ? [{ ixs, signers, role: "client", action: "Minted test USDC for the demo wallets" }] : []),
        { ixs: [createIx], signers: [], role: "client", action: `Proposed contract on devnet: 5% retention, ${WARRANTY_SECS} s warranty (2 years in real life)` },
        { ixs: [await acceptIx()], signers: [signer("sub")], role: "sub", action: "Subcontractor accepted the terms and the arbiter" },
      ]);
    } catch (e) {
      if (fundsNewMint && !(await conn.getAccountInfo(mint()))) { st.mint = null; save(); }
      throw e;
    }
  },
  async pay({ amount }) {
    const c = contractPda();
    const ix = await program.methods.payProgress(new BN(amount * DEC))
      .accountsPartial({ client: me, contract: c, mint: mint(), clientToken: ata(me), subcontractorToken: ata(pub("sub")), vault: ata(c), tokenProgram: TP })
      .instruction();
    const ret = Math.floor(amount * 5 / 100);
    return send([ix], [], "client", `Paid invoice ${fmt(amount)} → ${fmt(amount - ret)} to subcontractor + ${fmt(ret)} into the vault (one transaction)`);
  },
  async defect({ amount }) {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sparking socket photo"))));
    const ix = await program.methods.raiseDefect(new BN(amount * DEC), hash)
      .accountsPartial({ client: me, contract: contractPda() }).instruction();
    return send([ix], [], "client", `Reported defect "sparking socket", froze ${fmt(amount)} (photo hash on-chain)`);
  },
  async resolve({ payClient }) {
    const c = contractPda();
    const ix = await program.methods.resolveDefect(!!payClient)
      .accountsPartial({ arbiter: pub("arbiter"), contract: c, mint: mint(), vault: ata(c), clientToken: ata(me), tokenProgram: TP })
      .instruction();
    return send([ix], [signer("arbiter")], "arbiter", payClient ? "Settled: repair cost goes to the developer" : "Settled: no defect, funds unfrozen");
  },
  async list({ price }) {
    const k = await fetchContract();
    if (!k) throw new Error("create a contract first");
    const holder = roleOf(k.beneficiary);
    const ix = await program.methods.listClaim(new BN(price * DEC))
      .accountsPartial({ beneficiary: k.beneficiary, contract: contractPda() }).instruction();
    return send([ix], holder === "client" ? [] : [signer(holder)], holder, `Listed own retention for sale at ${fmt(price)} (cash now instead of in 2 years)`);
  },
  async buy() {
    const k = await fetchContract();
    if (!k) throw new Error("create a contract first");
    const c = contractPda();
    const unfrozen = Math.max(0, Math.round((await tokenBalance(c)) * DEC) - k.frozen.toNumber());
    const ix = await program.methods.buyClaim(k.askPrice, new BN(unfrozen))
      .accountsPartial({ buyer: pub("funder"), contract: c, mint: mint(), vault: ata(c), buyerToken: ata(pub("funder")), sellerToken: ata(k.beneficiary), tokenProgram: TP })
      .instruction();
    return send([ix], [signer("funder")], "funder", `Bought the claim for ${fmt(k.askPrice.toNumber() / DEC)}: payment and ownership change in one transaction`);
  },
  early() { return release("client"); },
};

const acceptIx = () => program.methods.acceptContract()
  .accountsPartial({ subcontractor: pub("sub"), contract: contractPda() }).instruction();
async function accept() {
  return send([await acceptIx()], [signer("sub")], "sub", "Subcontractor accepted the terms and the arbiter");
}

async function release(by) {
  const k = await fetchContract();
  if (!k) throw new Error("create a contract first");
  const c = contractPda();
  const amount = await tokenBalance(c);
  const ix = await program.methods.release()
    .accountsPartial({ caller: pub(by), contract: c, mint: mint(), vault: ata(c), beneficiaryToken: ata(k.beneficiary), tokenProgram: TP })
    .instruction();
  return send([ix], by === "client" ? [] : [signer(by)], by, `Clicked the Blink "Release funds": ${fmt(amount)} went to the claim holder`);
}

async function view() {
  const k = await fetchContract();
  const roles = {};
  for (const r of Object.keys(names)) roles[r] = { name: names[r], pubkey: pub(r).toBase58(), balance: st.mint ? await tokenBalance(pub(r)) : 0 };
  let contract = null;
  if (k) {
    const c = contractPda();
    contract = {
      address: c.toBase58(), url: explorer("address", c.toBase58()), title: k.title, retentionPct: k.retentionBps / 100,
      createdAt: k.createdAt.toNumber() * 1000, warrantyEnd: k.warrantyEnd.toNumber() * 1000,
      totalPaid: k.totalPaid.toNumber() / DEC, retained: k.retained.toNumber() / DEC, frozen: k.frozen.toNumber() / DEC,
      paidOutToClient: k.paidOutToClient.toNumber() / DEC, released: k.released.toNumber() / DEC, askPrice: k.askPrice.toNumber() / DEC,
      status: k.status.active ? "active" : k.status.proposed ? "proposed" : "released", beneficiary: roleOf(k.beneficiary), vault: await tokenBalance(c),
    };
  }
  const sol = (await conn.getBalance(me)) / LAMPORTS_PER_SOL;
  return { programId: PROGRAM_ID.toBase58(), mint: st.mint, roles, contract, log: st.log.slice(), now: Date.now(), sol, devnet: true };
}

let last = null;
async function blink() {
  const k = last && last.contract;
  return { title: "Holdback: release retention", label: "Release funds",
    description: !k ? "No contract yet" : k.status === "released" ? `${k.title}. Retention of ${fmt(k.released)} already released.` : `${k.title}. ${fmt(k.vault)} in the vault. Warranty ${Date.now() >= k.warrantyEnd ? "is over: click and the money goes to the claim holder" : "still running"}.`,
    disabled: !k || k.status !== "active" || Date.now() < k.warrantyEnd || k.frozen > 0 };
}

async function api(p, body) {
  if (p === "/api/state") { last = await view(); return last; }
  if (p.startsWith("/api/do/")) {
    const n = p.slice(8);
    if (n === "reset") { st = fresh(); save(); return {}; }
    if (n !== "create" && !st.mint) throw new Error("create a contract first");
    return actions[n](body || {});
  }
  if (p === "/api/actions/release") { if (!body) return blink(); return { type: "transaction", transaction: "devnet" }; }
  if (p === "/api/wallet/sign-and-send") return release("stranger");
  throw new Error("unknown route");
}

async function connect() {
  wallet = phantom();
  if (!wallet) throw new Error("Phantom is not installed");
  await wallet.connect();
  me = wallet.publicKey;
  const provider = new AnchorProvider(conn, { publicKey: me, signTransaction: (t) => wallet.signTransaction(t), signAllTransactions: (t) => wallet.signAllTransactions(t) }, { commitment: "confirmed" });
  program = new Program(idl, provider);
  st = load();
  return { pubkey: me.toBase58(), sol: (await conn.getBalance(me)) / LAMPORTS_PER_SOL };
}

async function airdrop() {
  const sig = await conn.requestAirdrop(me, 1 * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
}

window.HoldbackDevnet = { connect, api, airdrop, available: () => !!phantom(), programId: PROGRAM_ID.toBase58(), explorer };

// Holdback demo server: talks to a local Solana validator, keeps demo wallets
// for every role, and exposes a Solana Action (Blink) for the release button.
const http = require("http");
const fs = require("fs");
const path = require("path");
const anchor = require("@coral-xyz/anchor");
const { BN } = anchor;
const {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, VersionedTransaction,
} = require("@solana/web3.js");
const spl = require("@solana/spl-token");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8899";
const PORT = Number(process.env.PORT || 3000);
const WARRANTY_SECS = Number(process.env.WARRANTY_SECS || 25);
const ARBITER_WINDOW_SECS = Number(process.env.ARBITER_WINDOW_SECS || 3600);
const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/holdback.json"), "utf8"));
const conn = new Connection(RPC, "confirmed");
const TP = spl.TOKEN_2022_PROGRAM_ID;
const D = 100; // 2 decimals

const roles = {
  client: { name: "Developer: Turan Build", kp: Keypair.generate() },
  sub: { name: "Subcontractor: Volt Electric", kp: Keypair.generate() },
  arbiter: { name: "Arbiter: site inspector", kp: Keypair.generate() },
  funder: { name: "Funder / lender", kp: Keypair.generate() },
  stranger: { name: "Anyone (a stranger)", kp: Keypair.generate() },
};

let mint = null;
let contract = null;
let contractId = 0;
let log = [];

const provider = new anchor.AnchorProvider(conn, new anchor.Wallet(roles.client.kp), { commitment: "confirmed" });
const program = new anchor.Program(idl, provider);
const ata = (owner) => spl.getAssociatedTokenAddressSync(mint, owner, true, TP);

async function feeOf(sig) {
  for (let i = 0; i < 10; i++) {
    const tx = await conn.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (tx) return tx.meta.fee;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

async function record(role, action, sig, details) {
  const fee = await feeOf(sig);
  log.unshift({ t: Date.now(), role: roles[role].name, action, sig, fee, details });
  return { sig, fee };
}

async function setup() {
  for (const r of Object.values(roles)) {
    const s = await conn.requestAirdrop(r.kp.publicKey, 5 * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(s, "confirmed");
  }
  const c = roles.client.kp;
  mint = await spl.createMint(conn, c, c.publicKey, null, 2, undefined, undefined, TP);
  for (const r of Object.values(roles)) {
    await spl.getOrCreateAssociatedTokenAccount(conn, c, mint, r.kp.publicKey, false, undefined, undefined, TP);
  }
  await spl.mintTo(conn, c, mint, ata(c.publicKey), c, 100_000_000 * D, [], undefined, TP);
  await spl.mintTo(conn, c, mint, ata(roles.funder.kp.publicKey), c, 200_000 * D, [], undefined, TP);
  contract = null;
  log = [];
}

function contractPda(id) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("contract"), roles.client.kp.publicKey.toBuffer(), new BN(id).toArrayLike(Buffer, "le", 8)],
    program.programId
  )[0];
}

async function bal(owner) {
  try { return Number((await spl.getAccount(conn, ata(owner), "confirmed", TP)).amount) / D; } catch { return 0; }
}

async function state() {
  const out = { programId: program.programId.toBase58(), mint: mint && mint.toBase58(), roles: {}, contract: null, log, now: Date.now() };
  for (const [k, r] of Object.entries(roles)) {
    out.roles[k] = { name: r.name, pubkey: r.kp.publicKey.toBase58(), balance: mint ? await bal(r.kp.publicKey) : 0 };
  }
  if (contract) {
    const c = await program.account.contract.fetch(contract);
    const benef = Object.entries(roles).find(([, r]) => r.kp.publicKey.equals(c.beneficiary));
    out.contract = {
      address: contract.toBase58(),
      title: c.title,
      retentionPct: c.retentionBps / 100,
      warrantyEnd: c.warrantyEnd.toNumber() * 1000,
      createdAt: c.createdAt.toNumber() * 1000,
      totalPaid: c.totalPaid.toNumber() / D,
      retained: c.retained.toNumber() / D,
      frozen: c.frozen.toNumber() / D,
      paidOutToClient: c.paidOutToClient.toNumber() / D,
      released: c.released.toNumber() / D,
      askPrice: c.askPrice.toNumber() / D,
      status: Object.keys(c.status)[0],
      beneficiary: benef ? benef[0] : c.beneficiary.toBase58(),
      vault: await bal(contract),
    };
  }
  return out;
}

const k = (role) => roles[role].kp;

const actions = {
  async reset() { await setup(); return {}; },
  async create() {
    contractId += 1;
    contract = contractPda(contractId);
    const sig = await program.methods
      .createContract(new BN(contractId), 500, new BN(WARRANTY_SECS), new BN(ARBITER_WINDOW_SECS), "Turan Residences, electrical, block B")
      .accounts({ client: k("client").publicKey, subcontractor: k("sub").publicKey, arbiter: k("arbiter").publicKey, mint, tokenProgram: TP })
      .signers([k("client")]).rpc();
    // the subcontractor accepts the terms and the arbiter before anything can be paid
    await program.methods.acceptContract()
      .accounts({ subcontractor: k("sub").publicKey, contract }).signers([k("sub")]).rpc();
    return record("client", "Created contract: 5% retention, " + WARRANTY_SECS + " s warranty (2 years in real life); subcontractor accepted", sig);
  },
  async pay({ amount }) {
    const sig = await program.methods.payProgress(new BN(Math.round(amount * D)))
      .accounts({ client: k("client").publicKey, contract, mint, clientToken: ata(k("client").publicKey), subcontractorToken: ata(k("sub").publicKey), tokenProgram: TP })
      .signers([k("client")]).rpc();
    return record("client", `Paid invoice ${fmt(amount)} → ${fmt(amount * 0.95)} to subcontractor + ${fmt(amount * 0.05)} into the vault (one transaction)`, sig);
  },
  async defect({ amount }) {
    const hash = Array.from(require("crypto").createHash("sha256").update("photo-of-broken-socket.jpg").digest());
    const sig = await program.methods.raiseDefect(new BN(Math.round(amount * D)), hash)
      .accounts({ client: k("client").publicKey, contract }).signers([k("client")]).rpc();
    return record("client", `Reported defect "sparking socket", froze ${fmt(amount)} (photo hash on-chain)`, sig);
  },
  async resolve({ payClient }) {
    const sig = await program.methods.resolveDefect(!!payClient)
      .accounts({ arbiter: k("arbiter").publicKey, contract, mint, clientToken: ata(k("client").publicKey), tokenProgram: TP })
      .signers([k("arbiter")]).rpc();
    return record("arbiter", payClient ? "Settled: repair cost goes to the developer" : "Settled: no defect, funds unfrozen", sig);
  },
  async list({ price }) {
    const sig = await program.methods.listClaim(new BN(Math.round(price * D)))
      .accounts({ beneficiary: k("sub").publicKey, contract }).signers([k("sub")]).rpc();
    return record("sub", `Listed own retention for sale at ${fmt(price)} (cash now instead of in 2 years)`, sig);
  },
  async early() {
    // the client tries to pull the retention back before the warranty ends
    await program.methods.release()
      .accounts({ caller: k("client").publicKey, contract, mint, beneficiaryToken: ata(k("sub").publicKey), tokenProgram: TP })
      .signers([k("client")]).rpc();
    return {};
  },
  async buy() {
    const c = await program.account.contract.fetch(contract);
    // the buyer states how much unfrozen money they expect in the vault (slippage guard)
    const vaultAmount = Number((await spl.getAccount(conn, ata(contract), "confirmed", TP)).amount);
    const minUnfrozen = Math.max(0, vaultAmount - c.frozen.toNumber());
    const sig = await program.methods.buyClaim(c.askPrice, new BN(minUnfrozen))
      .accounts({ buyer: k("funder").publicKey, contract, mint, buyerToken: ata(k("funder").publicKey), sellerToken: ata(c.beneficiary), tokenProgram: TP })
      .signers([k("funder")]).rpc();
    return record("funder", `Bought the claim for ${fmt(c.askPrice.toNumber() / D)}: payment and ownership change in one transaction`, sig);
  },
};

function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

// ---- Solana Action (Blink): release, signed by whoever clicks ----
async function buildReleaseTx(account) {
  const c = await program.account.contract.fetch(contract);
  const tx = await program.methods.release()
    .accounts({ caller: account, contract, mint, beneficiaryToken: ata(c.beneficiary), tokenProgram: TP })
    .transaction();
  tx.feePayer = account;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  return tx.serialize({ requireAllSignatures: false }).toString("base64");
}

async function actionGet() {
  const s = await state();
  const c = s.contract;
  return {
    type: "action",
    icon: `http://localhost:${PORT}/icon.svg`,
    title: "Holdback: release retention",
    description: c && c.status === "released"
      ? `${c.title}. Retention of ${fmt(c.released)} already released.`
      : c
      ? `${c.title}. ${fmt(c.vault)} in the vault. Warranty ${Date.now() >= c.warrantyEnd ? "is over: click and the money goes to the claim holder" : "still running"}.`
      : "No contract yet",
    label: "Release funds",
    disabled: !c || c.status !== "active" || Date.now() < c.warrantyEnd || c.frozen > 0,
  };
}

const server = http.createServer(async (req, res) => {
  const send = (code, obj, type = "application/json") => {
    res.writeHead(code, {
      "Content-Type": type,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
      "X-Action-Version": "2.4",
      "X-Blockchain-Ids": "solana:localnet",
    });
    res.end(typeof obj === "string" || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj));
  };
  try {
    const url = new URL(req.url, "http://x");
    const body = await new Promise((r) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => r(b ? JSON.parse(b) : {})); });
    if (req.method === "OPTIONS") return send(200, "");
    if (url.pathname === "/actions.json") return send(200, { rules: [{ pathPattern: "/release", apiPath: "/api/actions/release" }] });
    if (url.pathname === "/api/actions/release" && req.method === "GET") return send(200, await actionGet());
    if (url.pathname === "/api/actions/release" && req.method === "POST") {
      const tx = await buildReleaseTx(new PublicKey(body.account));
      return send(200, { type: "transaction", transaction: tx, message: "Retention sent to the claim holder" });
    }
    // demo wallet: signs an Action transaction as the given role (stands in for Phantom)
    if (url.pathname === "/api/wallet/sign-and-send") {
      const tx = Transaction.from(Buffer.from(body.transaction, "base64"));
      tx.partialSign(k(body.role));
      const sig = await conn.sendRawTransaction(tx.serialize());
      await conn.confirmTransaction(sig, "confirmed");
      const s = await state();
      return send(200, await record(body.role, `Clicked the Blink "Release funds": ${fmt(s.contract.released)} went to the claim holder`, sig));
    }
    if (url.pathname === "/api/state") return send(200, await state());
    if (url.pathname.startsWith("/api/do/")) {
      const name = url.pathname.slice(8);
      if (!actions[name]) return send(404, { error: "unknown action" });
      const r = await actions[name](body);
      return send(200, r);
    }
    const file = path.join(__dirname, "public", url.pathname === "/" ? "index.html" : url.pathname);
    if (file.startsWith(path.join(__dirname, "public")) && fs.existsSync(file)) {
      const ext = path.extname(file);
      const type = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css" }[ext] || "application/octet-stream";
      return send(200, fs.readFileSync(file), type);
    }
    send(404, { error: "not found" });
  } catch (e) {
    const raw = String((e && e.error && e.error.errorCode && e.error.errorCode.code) || (e && e.message) || e);
    const ru = {
      WarrantyNotOver: "the warranty has not ended yet, the vault is locked",
      WarrantyOver: "the warranty has already ended",
      DefectOpen: "a defect dispute is open",
      NotActive: "the contract is not open for this (not accepted yet, or already closed)",
      NotProposed: "the contract was already accepted",
      BadParties: "client, subcontractor and arbiter must be different wallets",
      VaultChanged: "the vault holds less unfrozen money than expected",
      UnsafeMint: "this token has extensions that can break the vault",
      NotForSale: "the claim is not for sale",
      BadDefectAmount: "the defect amount exceeds what is locked in the vault",
      ConstraintHasOne: "this wallet is not allowed to do that",
    };
    const key = Object.keys(ru).find((x) => raw.includes(x));
    const msg = key ? ru[key] : raw;
    send(400, { error: msg });
  }
});

setup().then(() => server.listen(PORT, () => console.log(`Holdback demo on http://localhost:${PORT} (program ${program.programId.toBase58()})`)));

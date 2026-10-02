// In-browser simulation of the Holdback program rules (same rules as programs/holdback/src/lib.rs).
const SIM = (() => {
  const WARRANTY_MS = 45000, FEE = 5000;
  const names = { client: "Developer: Turan Build", sub: "Subcontractor: Volt Electric", arbiter: "Arbiter: site inspector", funder: "Funder / lender", stranger: "Anyone (a stranger)" };
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const rnd = (n) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  let st;
  function reset() {
    st = { roles: {}, contract: null, log: [], programId: "6t4LfjbFTBDVhmNypAsHYSvaKdpBNmWLpDaF3G8nZrvB" };
    for (const k of Object.keys(names)) st.roles[k] = { name: names[k], pubkey: rnd(44), balance: 0 };
    st.roles.client.balance = 1000000; st.roles.funder.balance = 200000;
  }
  reset();
  const fail = (m) => { throw new Error(m); };
  const rec = (role, action) => { st.log.unshift({ t: Date.now(), role: names[role], action, sig: rnd(88), fee: FEE }); return {}; };
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const c = () => st.contract || fail("create a contract first");
  const locked = (k) => k.retained - k.paidOutToClient - k.frozen;
  const actions = {
    create() {
      if (st.contract && st.contract.status === "active") fail("a contract is already open, reset to start over");
      st.contract = { address: rnd(44), title: "Turan Residences, electrical, block B", retentionPct: 5, createdAt: Date.now(), warrantyEnd: Date.now() + WARRANTY_MS, totalPaid: 0, retained: 0, frozen: 0, paidOutToClient: 0, released: 0, askPrice: 0, status: "active", beneficiary: "sub", vault: 0 };
      return rec("client", "Created contract: 5% retention, " + WARRANTY_MS / 1000 + " s warranty (2 years in real life)");
    },
    pay({ amount }) {
      const k = c(); if (k.status !== "active") fail("the contract is already closed");
      if (st.roles.client.balance < amount) fail("insufficient balance");
      const ret = Math.floor(amount * 5 / 100), toSub = amount - ret;
      st.roles.client.balance -= amount; st.roles.sub.balance += toSub; k.vault += ret;
      k.totalPaid += amount; k.retained += ret;
      return rec("client", `Paid invoice ${fmt(amount)} → ${fmt(toSub)} to subcontractor + ${fmt(ret)} into the vault (one transaction)`);
    },
    defect({ amount }) {
      const k = c(); if (k.status !== "active") fail("the contract is already closed");
      if (Date.now() >= k.warrantyEnd) fail("the warranty has already ended");
      if (k.frozen > 0) fail("a defect dispute is open");
      if (amount <= 0 || amount > locked(k)) fail("the defect amount exceeds what is locked in the vault");
      k.frozen = amount;
      return rec("client", `Reported defect "sparking socket", froze ${fmt(amount)} (photo hash on-chain)`);
    },
    resolve({ payClient }) {
      const k = c(); if (!(k.frozen > 0)) fail("there is no open defect");
      const a = k.frozen;
      if (payClient) { k.vault -= a; st.roles.client.balance += a; k.paidOutToClient += a; }
      k.frozen = 0;
      return rec("arbiter", payClient ? "Settled: repair cost goes to the developer" : "Settled: no defect, funds unfrozen");
    },
    list({ price }) {
      const k = c(); if (k.status !== "active") fail("the contract is already closed");
      k.askPrice = price;
      return rec(k.beneficiary, `Listed own retention for sale at ${fmt(price)} (cash now instead of in 2 years)`);
    },
    buy() {
      const k = c(); if (k.status !== "active") fail("the contract is already closed");
      if (!(k.askPrice > 0)) fail("the claim is not for sale");
      if (k.beneficiary === "funder") fail("the buyer already owns the claim");
      if (st.roles.funder.balance < k.askPrice) fail("insufficient balance");
      st.roles.funder.balance -= k.askPrice; st.roles[k.beneficiary].balance += k.askPrice;
      const p = k.askPrice; k.beneficiary = "funder"; k.askPrice = 0;
      return rec("funder", `Bought the claim for ${fmt(p)}: payment and ownership change in one transaction`);
    },
    early() {
      const k = c(); if (k.status !== "active") fail("the contract is already closed");
      if (Date.now() < k.warrantyEnd) fail("the warranty has not ended yet, the vault is locked");
      return actions.release("client");
    },
    release(by) {
      const k = c(); if (k.status !== "active") fail("the contract is already closed");
      if (Date.now() < k.warrantyEnd) fail("the warranty has not ended yet, the vault is locked");
      if (k.frozen > 0) fail("a defect dispute is open");
      const a = k.vault; st.roles[k.beneficiary].balance += a; k.vault = 0; k.released = a; k.status = "released";
      return rec(typeof by === "string" ? by : "stranger", `Clicked the Blink "Release funds": ${fmt(a)} went to the claim holder`);
    },
  };
  const view = () => ({ programId: st.programId, mint: "test-USDC", roles: JSON.parse(JSON.stringify(st.roles)), contract: st.contract && { ...st.contract }, log: st.log.slice(), now: Date.now() });
  const blink = () => {
    const k = st.contract;
    return { title: "Holdback: release retention", label: "Release funds",
      description: !k ? "No contract yet" : k.status === "released" ? `${k.title}. Retention of ${fmt(k.released)} already released.` : `${k.title}. ${fmt(k.vault)} in the vault. Warranty ${Date.now() >= k.warrantyEnd ? "is over: click and the money goes to the claim holder" : "still running"}.`,
      disabled: !k || k.status !== "active" || Date.now() < k.warrantyEnd || k.frozen > 0 };
  };
  return async function api(p, body) {
    if (p === "/api/state") return view();
    if (p.startsWith("/api/do/")) { const n = p.slice(8); if (n === "reset") { reset(); return {}; } return actions[n](body || {}); }
    if (p === "/api/actions/release") { if (!body) return blink(); return { type: "transaction", transaction: "sim" }; }
    if (p === "/api/wallet/sign-and-send") return actions.release("stranger");
    throw new Error("unknown route");
  };
})();

// Records the demo video timed to the voice-over (beat times come from forced alignment of the recording).
// Start the validator and `WARRANTY_SECS=36 node app/server.js` first. Prints the video offset to trim.
const { chromium } = require('playwright');
const W = 1440, H = 900;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: '/tmp/vid-demo2', size: { width: W, height: H } } });
  const p = await ctx.newPage();
  const tPage = Date.now();
  const cap = (t) => p.evaluate((t) => setCaption(t), t);
  const act = (a, x) => p.evaluate(([a, x]) => runAction(a, x), [a, x]);
  await p.goto('http://localhost:3000'); await p.waitForTimeout(800);
  const t0 = Date.now();
  console.log('OFFSET', (t0 - tPage) / 1000);
  const at = async (T, fn) => { const d = T * 1000 - (Date.now() - t0); if (d > 0) await p.waitForTimeout(d); await fn(); };
  await at(1.0, () => cap('A developer pays a subcontractor, but keeps 5% "as a warranty" for 1–2 years'));
  await at(5.8, () => cap('That money gets delayed, spent, or lost in a bankruptcy. Holdback fixes this'));
  await at(10.4, async () => { await cap('1. The developer opens a contract on Solana: 5% retention'); await act('create'); });
  await at(13.9, async () => { await cap('2. Invoice of $50,000: the program splits the payment in one transaction'); await act('pay', { amount: 50000 }); });
  await at(19.3, () => cap('95% goes to the subcontractor now, 5% goes into a vault owned by nobody'));
  await at(25.4, async () => { await cap('Second invoice: another $50,000, the vault grows'); await act('pay', { amount: 50000 }); });
  await at(28.3, () => cap('3. The developer tries to take the retention back early…'));
  await at(29.4, () => act('early'));
  await at(30.8, () => cap('The program refuses. Nobody can touch the money before the warranty ends'));
  await at(32.3, async () => { await cap('4. A defect is found: only $500 is frozen for repair, not the whole vault'); await act('defect', { amount: 500 }); });
  await at(37.1, async () => { await cap('5. The arbiter (site inspector) settles it: $500 goes to the repair'); await act('resolve', { payClient: true }); });
  await at(38.3, async () => { await cap('6. The subcontractor needs cash now and sells the retention at 90%'); await act('list'); });
  await at(41.1, async () => { await cap('The funder pays, and the claim moves to them in the same transaction. No one can cheat'); await act('buy'); });
  await at(45.9, () => cap('The warranty is running. Years in real life, seconds in the demo'));
  for (let i = 0; i < 40; i++) { const left = await p.evaluate(() => S.contract.warrantyEnd - Date.now()); if (left < 0) break; await p.waitForTimeout(500); }
  await at(50.4, () => cap('7. The warranty is over. Anyone clicks the Blink "Release funds"'));
  await at(51.4, () => p.click('#bbtn'));
  await at(53.0, () => cap('The money went to the claim holder. No calls, no lawyers, no begging'));
  await at(55.7, () => cap('All fees together: under 0.0001 SOL. Open source, 22 tests passing'));
  await at(61.3, () => cap('Holdback: retention money nobody can sit on'));
  await at(66.0, async () => {});
  console.log('END', (Date.now() - t0) / 1000);
  await ctx.close(); await b.close();
})();

// Records the demo video: drives the real UI against a local Solana validator.
// Start the validator and `WARRANTY_SECS=55 node app/server.js` first.
const { chromium } = require('playwright');
const W = 1440, H = 900;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: '/tmp/vid-demo', size: { width: W, height: H } } });
  const p = await ctx.newPage();
  const cap = (t) => p.evaluate((t) => setCaption(t), t);
  const act = (a, x) => p.evaluate(([a, x]) => runAction(a, x), [a, x]);
  const wait = (ms) => p.waitForTimeout(ms);
  await p.goto('http://localhost:3000'); await wait(1500);
  await cap('A developer pays a subcontractor, but keeps 5% "as a warranty" for 1–2 years'); await wait(4500);
  await cap('That money gets delayed, spent, or lost in a bankruptcy. Holdback fixes this'); await wait(4500);
  await cap('1. The developer opens a contract on Solana: 5% retention'); await act('create'); await wait(4000);
  await cap('2. Invoice of $50,000: the program splits the payment in one transaction'); await act('pay', { amount: 50000 }); await wait(5000);
  await cap('95% goes to the subcontractor now, 5% goes into a vault owned by nobody'); await wait(3500);
  await cap('Second invoice: another $50,000, the vault grows'); await act('pay', { amount: 50000 }); await wait(4000);
  await cap('3. The developer tries to take the retention back early…'); await wait(2500); await act('early'); await wait(3500);
  await cap('The program refuses. Nobody can touch the money before the warranty ends'); await wait(3500);
  await cap('4. A defect is found: only $500 is frozen for repair, not the whole vault'); await act('defect', { amount: 500 }); await wait(4500);
  await cap('5. The arbiter (site inspector) settles it: $500 goes to the repair'); await act('resolve', { payClient: true }); await wait(4500);
  await cap('6. The subcontractor needs cash now and sells the retention at 90%'); await act('list'); await wait(4500);
  await cap('The funder pays, and the claim moves to them in the same transaction. No one can cheat'); await act('buy'); await wait(5500);
  await cap('The warranty is running. Years in real life, seconds in the demo');
  for (let i = 0; i < 70; i++) {
    const left = await p.evaluate(() => S.contract.warrantyEnd - Date.now());
    if (left < 0) break;
    await wait(1000);
  }
  await wait(4500);
  await cap('7. The warranty is over. Anyone clicks the Blink "Release funds"'); await wait(2500);
  await p.click('#bbtn'); await wait(5000);
  await cap('The money went to the claim holder. No calls, no lawyers, no begging'); await wait(4500);
  await cap('All fees together: under 0.0001 SOL. Open source, 7 tests passing'); await wait(5000);
  await cap('Holdback: retention money nobody can sit on'); await wait(3500);
  await ctx.close(); await b.close();
})();

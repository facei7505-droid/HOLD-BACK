// Records the pitch video: walks the deck slide by slide with subtitles.
const { chromium } = require('playwright');
const script = [
  [1, ['Holdback: retention money nobody can sit on.'], 5000],
  [2, ['Over three years, English subcontractors were never paid almost 8 billion pounds of their own money.', '44% lost retention to an insolvency. In the US, 43% wait over 90 days.'], 11000],
  [3, ['Here is the setup: the client keeps 5% of every payment as a warranty for one or two years.', 'That money sits with the party that owes it. It gets delayed, spent, or lost in a bankruptcy.'], 11000],
  [4, ['Governments know. New Zealand requires a separate trust account, the UK plans to ban retention.', 'Holdback is the third way: the retention stays, but it cannot be abused.'], 11000],
  [5, ['A Solana program splits every payment: 95% to the subcontractor, 5% into a vault with no key.', 'A defect freezes only its own cost. After the warranty, anyone clicks a button and the money is released.'], 12000],
  [6, ['And something a bank cannot do: the subcontractor can sell their retention today, at 90%.', 'Payment and transfer of the claim happen in one transaction, so nobody can cheat.'], 11000],
  [7, ['This is a real Anchor program: a PDA vault, atomic splitting, Token-2022 and a Blink for release.', 'Each action costs 0.000005 SOL. It is open source and 7 tests pass.'], 11000],
  [8, ['The demo runs on a local Solana network, the whole flow from contract to release.'], 6000],
  [9, ['Retention is standard in England, the US, Canada, New Zealand and the CIS.', 'England alone has 3 to 6 billion pounds held at any time during a year.'], 10000],
  [10, ['Unlike the client\'s own account or a bank trust, Holdback pays out by itself and lets you get paid early.', 'Among 5,428 Colosseum projects, none is about construction retention.'], 12000],
  [11, ['We start with interviews in Shymkent, then a devnet pilot, then New Zealand and Australia.', 'The biggest risk is that clients like holding the money. We test that first.'], 11000],
  [12, ['Holdback: a subcontractor\'s money sits with rules, not with the debtor.'], 6000],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: '/tmp/vid-pitch', size: { width: 1920, height: 1080 } } });
  const p = await ctx.newPage();
  await p.goto('file://' + __dirname + '/../deck/holdback-pitch.html'); await p.waitForTimeout(800);
  for (const [n, lines, ms] of script) {
    await p.evaluate((n) => go(n), n);
    const per = Math.round(ms / lines.length);
    for (const l of lines) { await p.evaluate((t) => setCaption(t), l); await p.waitForTimeout(per); }
  }
  await ctx.close(); await b.close();
})();

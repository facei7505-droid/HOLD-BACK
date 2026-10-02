// Records the pitch video timed to the voice-over (slide and caption times come from forced alignment of the recording).
// Usage: node media/record-pitch-voiced.js media/pitch-schedule.json ; prints the video offset to trim.
const { chromium } = require('playwright');
const sched = require(require('path').resolve(process.argv[2]));
const END = Number(process.argv[3] || 97.5);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: '/tmp/vid-pitch2', size: { width: 1920, height: 1080 } } });
  const p = await ctx.newPage();
  const tPage = Date.now();
  await p.goto('file://' + __dirname + '/../deck/holdback-pitch.html'); await p.waitForTimeout(800);
  const t0 = Date.now();
  console.log('OFFSET', (t0 - tPage) / 1000);
  const at = async (T) => { const d = T * 1000 - (Date.now() - t0); if (d > 0) await p.waitForTimeout(d); };
  for (const [n, caps] of sched) {
    await at(Math.max(0, caps[0][0] - 0.3));
    await p.evaluate((n) => go(n), n);
    for (const [T, text] of caps) { await at(T); await p.evaluate((t) => setCaption(t), text); }
  }
  await at(END);
  await ctx.close(); await b.close();
})();

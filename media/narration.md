# Narration script (English)

Both videos are recorded with subtitles and no voice. To add a voice, record yourself reading this text over the video (CapCut, DaVinci Resolve, or any editor).

## Video 1: demo (`holdback-demo.mp4`, 1:32)

| Time | Say |
|---|---|
| 0:00 | A developer pays a subcontractor, but keeps 5% "as a warranty" for one or two years. That money often gets delayed, spent, or lost in a bankruptcy. |
| 0:10 | The developer opens a contract on Solana: 5% retention. |
| 0:14 | An invoice of fifty thousand dollars. The program splits the payment in one transaction: 95% goes to the subcontractor now, 5% into a vault owned by nobody. |
| 0:23 | A second invoice, and the vault grows. |
| 0:27 | The developer tries to take the retention back early, and the program refuses. |
| 0:36 | A defect is found. Only five hundred dollars are frozen for the repair, not the whole vault. The arbiter settles it. |
| 0:45 | The subcontractor needs cash now and sells the retention at 90%. The funder pays and the claim moves to them in the same transaction. |
| 0:55 | The warranty is running: years in real life, seconds in the demo. |
| 1:12 | The warranty is over. Anyone clicks the Blink, and the money goes to the claim holder. No calls, no lawyers. |
| 1:22 | All fees together are under one ten-thousandth of a SOL. Open source, tests passing. |

## Video 2: pitch (`holdback-pitch.mp4`, 2:04)

The text matches the on-screen subtitles, slide by slide:

1. Holdback: retention money nobody can sit on.
2. Over three years, English subcontractors were never paid almost 8 billion pounds of their own money. 44% lost retention to an insolvency. In the US, 43% wait over 90 days.
3. The client keeps 5% of every payment as a warranty for one or two years. That money sits with the party that owes it.
4. Governments know. New Zealand requires a separate trust account, the UK plans to ban retention. Holdback is the third way.
5. A Solana program splits every payment, a defect freezes only its own cost, and after the warranty anyone clicks a button to release the money.
6. The subcontractor can sell the retention today, at 90%, in one transaction.
7. A real Anchor program: PDA vault, atomic splitting, Token-2022, Blink. Each action costs 0.000005 SOL.
8. The demo runs on a local Solana network.
9. Retention is standard in England, the US, Canada, New Zealand and the CIS.
10. Holdback pays out by itself and lets you get paid early. None of 5,428 Colosseum projects is about construction retention.
11. We start with interviews in Shymkent, then a devnet pilot, then New Zealand and Australia.
12. Holdback: a subcontractor's money sits with rules, not with the debtor.

## How to record so it fits the video

- Record each video as one take, reading the table or the numbered list above at a calm pace (about 130 words per minute). Silence at the start is fine.
- The demo video has 10 caption beats (listed with times above). The pitch video has 12 slides of 5–12 seconds each. If your take is longer than the video, `scripts/add-voice.sh` holds the last frame; if it drifts, tell me where and I will retime the captions and re-record the video to match your voice.
- Run: `scripts/add-voice.sh media/holdback-demo.mp4 my-demo-voice.m4a media/holdback-demo-voice.mp4`

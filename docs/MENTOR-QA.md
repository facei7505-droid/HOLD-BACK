# Mentor and jury cheat sheet

Short honest answers to the questions we expect. Read it aloud once before the pitch. Links point to the detailed documents.

## The product

**What is it in one sentence?**
A Solana program that splits every construction payment into "paid now" and "locked retention", and releases the retention automatically after the warranty ends, with no one able to sit on it.

**Why Solana and not a normal database or bank escrow?**
The point is that nobody controls the vault: the program owns it. A bank trust account or a database needs a party you trust, and the whole problem is that the client cannot be trusted with the money. Fees are about $0.000005 per action, so small contracts are possible. See [THREAT-MODEL.md](THREAT-MODEL.md) for what that claim depends on (including the upgrade authority).

**What is working today?**
The program deployed on devnet, 22 passing tests (run by CI on every push), a site where you can run the whole flow on devnet with Phantom, a Solana Action ("Blink") for release, and a simulation. See the [scorecard](SCORECARD.md) for what is not done.

**What is not done?**
No customers or interviews yet. Not audited. Devnet only, with a test token instead of real money; only the client role signs with Phantom, the other roles are throwaway browser keypairs. No fee mechanism in the program yet.

## Why a client would agree

**Why would a developer lock money they can hold for free today?**
Honest answer: we do not know yet, and it is our biggest risk. Our hypotheses: it replaces a retention bond; it improves tender scores; the vault can earn yield for them. We will test this in the first ten interviews. See [BUSINESS-MODEL.md](BUSINESS-MODEL.md).

## Law

**Is retention in a program legally protected if the client goes bankrupt?**
Unproven. In English law case law says retention is protected in insolvency only if it is held on trust in a separate fund; New Zealand made that mandatory by statute. A vault that no one can touch is a stronger form of segregation in practice, but no court has ruled on a smart-contract vault. We say that plainly and recommend a legal opinion before any real money. See [LEGAL.md](LEGAL.md).

**Is the program a financial product or a money transmitter?**
For the hackathon it runs on devnet with test tokens and is non-custodial in the sense that no company holds funds. Real use needs a local legal review (Kazakhstan, AIFC). Not done.

## Security

**Has it been audited?**
No. Self-review only, with a documented threat model and fixes applied. A professional audit is required before real funds. See [THREAT-MODEL.md](THREAT-MODEL.md).

**What stops the client from naming a friendly arbiter and draining the vault?**
Today only an off-chain agreement. The review found this is the largest trust gap; the fix is that both parties must agree to the contract (subcontractor accepts) and the arbiter cannot be the client. Status is in the threat model.

**Who can upgrade the program?**
The deployer key can, as on any Solana program. For real use the authority must be a multisig or the program must be made immutable. Until then, "nobody controls it" is true of the vault's day-to-day use, not of the code.

**What if the stablecoin issuer freezes the vault?**
USDC has a freeze authority. A frozen vault cannot pay out. This is a stablecoin risk, not ours, and is stated in the threat model.

## Market and money

**How big is the market?**
Kazakhstan: about $0.2 bn of retention a year, a fee pool near $1 m at 0.5%. England alone: £3.2–5.9 bn a year of retention. The pitch is global; Kazakhstan is the pilot. See [MARKET-MODEL.md](MARKET-MODEL.md).

**How do you make money?**
Three lines: flat contract fee, a fee when the subcontractor sells the claim for cash, and a share of vault yield. A fee on the held amount alone is too thin ($50 per contract per year). Break-even is about 780 contracts a year with the first two. See [BUSINESS-MODEL.md](BUSINESS-MODEL.md).

**Who are the competitors?**
Retention bonds and insurance (cost the subcontractor or client money, still depend on a company), construction payment platforms like Textura or Procore Pay (hold money in banks), and escrow services. In the Colosseum database none of 5,428 projects is about construction retention.

## Team and next steps

**Who is on the team?**
Students, no construction experience yet. We are recruiting one construction or legal advisor ([ADVISOR-OUTREACH.md](ADVISOR-OUTREACH.md)).

**What are you doing in the next 30 days?**
Ten interviews (seven subcontractors, three developers) with letters of intent, a wallet per role on devnet, a legal opinion request, a security review by an outside developer. See [INTERVIEW-KIT.md](INTERVIEW-KIT.md).

**What would make you stop?**
If most clients say "I will not lock money for any fee" and subcontractors will not pay to be paid on time, the product has no payer. Then we would pivot to the financing side only (claim sales), or stop.

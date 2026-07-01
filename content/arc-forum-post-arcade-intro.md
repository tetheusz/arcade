# I built Arcade — a Portuguese-first way for Brazilians to learn and build on Arc

Hey everyone,

I've been lurking around Arc for a while and finally decided to ship something instead of just reading docs. It's called **Arcade**, and it's a small project with a pretty specific goal: help Brazilian builders get into Arc without the language barrier and the "where do I even start" paralysis.

Quick context on why I made it. The Arc docs are genuinely good, but if you're a dev in Brazil who isn't super comfortable in English, or you just don't have a clear path to follow, you end up opening ten tabs, deploying a contract once, and then never coming back. I wanted to fix the *sequence*, not rewrite the docs.

So Arcade is basically three things stitched together:

- **A journal** — I translate Arc docs into PT-BR and write some original articles (opinion pieces, "here's what actually clicked for me after my first deploy", that kind of thing).
- **Daily challenges** — tiny word/connection/security puzzles based on Arc concepts. It's spaced repetition disguised as a game. Stuff like "what's the revert message when your CCTP bridge amount is below the max fee" sticks a lot better when you had to recall it yourself.
- **Bounties** — small tasks that pay out testnet USDC on Arc and build a reputation score. The point isn't the money (it's testnet), it's closing the full loop: submit → review → on-chain payout.

The whole thing runs on Arc Testnet, USDC as gas, and I've been leaning on the stuff Circle shipped — App Kit, CCTP, the faucet. Payouts go out from an admin wallet with a plain USDC transfer, nothing fancy.

A few honest things:

- It's early. I've been publishing a translation + three challenges most days and slowly filling out the bounty side.
- It's opinionated toward beginners and toward Portuguese. If you're already deep in Arc, it's probably not for you — but if you know someone in the BR community who's curious, this might lower the barrier.
- I'm doing a lot of it semi-automated (translation pipeline + review in the admin), so if something reads awkward, that's on me, tell me and I'll fix it.

What I'd love feedback on:

1. Am I representing Arc concepts accurately in the translations? I care more about being correct than being fast.
2. Is there interest in a similar approach for other non-English communities? I kept the pipeline generic enough that it could be repointed.
3. Any Arc-specific gotchas you wish someone had told you on day one? I'd like to turn those into challenges.

If you want to poke at it, it's live here: https://arcade-nu-blush.vercel.app

Not trying to sell anything — genuinely just want more people building on Arc, and this is my attempt at pulling my corner of the community in. Happy to answer anything.

— a builder from Brazil

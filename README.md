# gta6-achievement-meme

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/vora95/gta6-achievement-meme/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/vora95/gta6-achievement-meme/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 meme for the make.fun bounty "Post a GTA 6 meme on X". The joke is
an achievement toast: after 4,811 days of waiting — GTA V came out on
17 Sep 2013, GTA VI on 19 Nov 2026 — the make.fun ghost finally unlocks
the wait itself. One big ghost, arms up in celebration, gold stars, a
Vice City sunset on the TV behind it. The picture is built to read in one
second at phone-feed size.

![The meme: the make.fun ghost celebrating with both arms raised in a dark living room, a Vice City sunset on the TV behind it. Top text: ACHIEVEMENT UNLOCKED. Bottom text: WAITED 4,811 DAYS FOR GTA 6.](meme.png)

The post is the entry: it was posted on X from a public account with make.fun
(a link to the bounty) and a tag of @makefunai and the entrant's play code in
its text. The house reads the post from X and an AI judge compares the posts
two at a time; the top 50 share $500. Likes, reposts, replies and views never
count.

make.fun is a site where people and their AI agents build things, enter them
in paid competitions (bounties) and earn real money when they win.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates `POST.json` (the X post URL) and `CAPTION.txt` against
the bounty rules, checks `meme.png`, and copies `POST.json` to the output
directory. It exits 1 only when `POST.json` is missing or is not a valid X
post URL, when the caption mistakes the referral code for a play code, or
when no output directory is writable; everything else is an advisory note.

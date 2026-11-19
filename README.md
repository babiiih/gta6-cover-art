# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/babiiih/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/babiiih/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Vice** is a GTA-poster-style cover art maker that runs entirely in your browser. Drop in one or more of your own photos, pick a multi-panel layout with slanted poster cuts, frame each photo inside its panel (drag to pan, slider to zoom), apply a Vice City sunset or neon colour grade, add a bold caption, and export the finished cover as a PNG at 1080×1080, 1080×1350 or 1920×1080. Everything is drawn locally on a canvas — your photos never leave your machine, and the app works fully offline from its own static files. All artwork, lettering and code are original: the caption font is Anton (SIL Open Font License), and no Rockstar logos, artwork or fonts are used.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Or open `app/index.html` directly — the app is plain static files under `app/` and needs no build step and no network.

The entry program for the bounty is `main.ts` (Node 22): it copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=b5jzhsrf&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

# Token Radar — Build the best token launch radar

A token launch radar for make.fun `token-radar-01`. It reads a sealed
DefiLlama protocol snapshot and ranks every pre-token protocol by what its
launch would be worth, each with the steps to farm it.

## What it does

- **Board:** 198 pre-token protocols ranked by implied value — the whole
  40-protocol watchlist (TVL ≥ $50M, no token on record) plus every other
  rankable pre-token protocol below the floor, at any size. Wrapped, staked
  and bridged products of tokens that already trade are excluded from the
  whole board (the watchlist's own rule), so the top is never WBTC or a
  staked-ETH product.
- **Value model (`radar-3`, `lib/model.ts`):**
  `implied = round(TVL × 0.25 × (1 + clamp(change_7d, −60, 120)/100 × 0.5)
  × (0.6 + min(age_days, 1095)/1095 × 0.4) × (1 + 0.02 × min(chains−1, 5)))`.
  One function scores every protocol; no name is special-cased. The
  dashboard recomputes every row with the same function and shows the
  breakdown, and a sandbox lets a reader replay the ranking with their
  own base multiple and growth weight.
- **Heat (`radar-3`):** a second signal, 0–100, from the snapshot alone —
  growth against the protocol's own category median (up to 40), youth
  (up to 20), size against the $50M floor (up to 15), chain breadth
  (up to 10) and strong absolute growth (up to 15). Hot is 70+, Warm
  45+. Heat never moves the implied value or the rank; it is the
  early-warning view, and the dashboard's early strip sorts the
  below-floor protocols by it. A category-momentum table shows each
  category's median 7-day growth, size and strongest row.
- **Risk flags:** a 0–100 heuristic from the snapshot alone (falling TVL,
  growth far below the category median, very young listing, single
  chain, small TVL, holding most of a category's TVL). The snapshot
  carries no audit, holder or honeypot data, so this is labelled as a
  heuristic — never a honeypot/rug verdict and never a safety claim.
- **Farm plans:** eight concrete steps per protocol, derived from its
  category, chains, TVL and age, each with a cost and a time — including
  a repeat step on the second chain for multi-chain protocols and an
  exit decided in advance, before any token launches.
- **Dashboard (`dashboard/`, no network, no framework):** KPI cards, an
  early-radar strip, Top-10 and category charts, category momentum,
  7-day growth histogram, fastest-growers strip, search / category /
  chain / growth / heat / min-TVL / watchlist-only filters, sortable
  columns (including heat), pagination, a detail view per protocol
  (model breakdown, heat reading, risk flags, farm plan with totals),
  and the model sandbox. Live-token protocols are set aside in their
  own tab with their market caps shown as facts, not a model.

## Run it

```sh
# Node 22.18+ (24/26 also fine). The grader mounts the sealed snapshot at /input.
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input token-radar-01-kit/input/snapshot.json
# then open out/dashboard/index.html in a browser
```

`main.ts` (Node standard library only) writes `out/board.json`,
`out/data.js`, copies `dashboard/` and `screenshots/` into `out/`, and
writes `out/dossier.json` with `buildDossier` from `vendor/makefun-board.ts`
(the kit's library, byte for byte).

## Validate it

```sh
node dev/validate.mjs
```

Checks the seven gate rows the scorer runs (dashboard files, board file,
rank order, watchlist coverage, farm steps, screenshots, dossier match),
runs the program twice and compares every byte for determinism, and
rebuilds the dossier from the output to compare it byte for byte.

## Layout

- `main.ts` — program entry: snapshot in, board + dashboard + dossier out
- `lib/model.ts` — value model, heat score, category momentum, risk score, farm plans, snapshot parsing
- `vendor/makefun-board.ts` — make.fun dossier library from the kit
- `dashboard/` — `index.html`, `app.css`, `app.js` (static, no network)
- `screenshots/` — 1-board, 2-detail, 3-filtered (1440×900)
- `token-radar-01-kit/` — the competition kit as downloaded (reference only)

## Honest limits

- The snapshot is frozen at 2026-11-14; the radar ranks what that snapshot
  records. It does not predict whether or when a token launches.
- "Records no token" is what DefiLlama's record says, never proof a
  protocol has no token.
- Implied values are the model's claim, never prices. Risk flags are
  snapshot heuristics, not a security audit. Heat is a relative signal,
  not a prediction that a token launches soon.

## License

MIT — see `LICENSE`.

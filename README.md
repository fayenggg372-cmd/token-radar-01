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
- **Value model (`radar-2`, `lib/model.ts`):**
  `implied = round(TVL × 0.25 × (1 + clamp(change_7d, −60, 120)/100 × 0.5)
  × (0.6 + min(age_days, 1095)/1095 × 0.4) × (1 + 0.02 × min(chains−1, 5)))`.
  One function scores every protocol; no name is special-cased. The
  dashboard recomputes every row with the same function and shows the
  breakdown, and a sandbox lets a reader replay the ranking with their
  own base multiple and growth weight.
- **Risk flags:** a 0–100 heuristic from the snapshot alone (falling TVL,
  very young listing, single chain, small TVL). The snapshot carries no
  audit, holder or honeypot data, so this is labelled as a heuristic —
  never a honeypot/rug verdict and never a safety claim.
- **Farm plans:** six concrete steps per protocol, derived from its
  category, chains, TVL and age, each with a cost and a time.
- **Dashboard (`dashboard/`, no network, no framework):** KPI cards, Top-10
  and category charts, 7-day growth histogram, fastest-growers strip,
  search / category / chain / growth / min-TVL / watchlist-only filters,
  sortable columns, pagination, a detail view per protocol, and the model
  sandbox. Live-token protocols are set aside in their own tab with their
  market caps shown as facts, not a model.

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

## Layout

- `main.ts` — program entry: snapshot in, board + dashboard + dossier out
- `lib/model.ts` — value model, risk score, farm plans, snapshot parsing
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
  snapshot heuristics, not a security audit.

## License

MIT — see `LICENSE`.

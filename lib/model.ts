// Token Radar — model radar-3.
//
// The board ranks every pre-token protocol the snapshot carries: the 40
// watchlist slugs are the floor, and every other rankable pre-token
// protocol joins them, so the radar finds launches below the floor instead
// of stopping at it. A protocol is pre-token when its record carries no
// token (no market cap, no CoinGecko id, no symbol); live-token protocols
// are kept apart and shown with their market cap, never mixed into the
// ranked board.
//
// Implied value follows only from the snapshot's own figures:
//
//   base       = tvl_usd x BASE_MULTIPLE            (0.25)
//   growth     = clamp(change_7d, -60, 120) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT (0.5)
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age unknown: 365)
//   breadth    = 1 + 0.02 x min(chains - 1, 5)       (multi-chain reach, max 1.10)
//   implied    = max(1, round(base x growthMult x maturity x breadth))
//
// No protocol name is ever special-cased: the same function scores every row.
// The dashboard recomputes every row with the same function and shows the
// breakdown, so the page, board.json and this file always agree.
//
// Heat is a second, separate signal — how hot a launch looks right now.
// It is also computed only from the snapshot, never from a list of names:
// how fast the protocol grows against its own category's median, how young
// it is, how big it is against the watchlist floor, how many chains it runs
// on, and whether its growth is strong in absolute terms. Heat never moves
// the implied value or the rank; it is the radar's early-warning view, and
// the dashboard's early strip sorts by it.
//
// Risk is a separate, honest signal. The snapshot carries no contract audit,
// no honeypot test and no holder data, so this radar never claims to detect a
// honeypot or a rug. The risk score (0-100) is only a heuristic over what the
// snapshot does carry — a falling TVL, growth far below its category, a very
// young listing, a single chain, a small TVL — and the dashboard labels it
// exactly that way.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.25,
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_per_chain: 0.02,
  breadth_max_chains: 5,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** How many categories the dashboard's momentum table carries. */
export const CATEGORY_ROWS = 12;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  risk_score: number;
  risk_band: 'Low' | 'Medium' | 'High';
  risk_flags: string[];
  heat_score: number;
  heat_band: 'Hot' | 'Warm' | 'Cool' | 'Cold';
  category_median_growth: number | null;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  risk_score: number;
  risk_band: 'Low' | 'Medium' | 'High';
  risk_flags: string[];
  heat_score: number;
  heat_band: 'Hot' | 'Warm' | 'Cool' | 'Cold';
  category_median_growth: number | null;
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One category's momentum: what the dashboard's momentum table shows. */
export interface CategoryStat {
  category: string;
  protocols: number;
  median_growth: number | null;
  total_implied_usd: number;
  top_slug: string;
  top_name: string;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
  categories: CategoryStat[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a list of numbers, or null when it holds none. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(protocol: SnapshotProtocol, asOf: string, model: ModelConstants): { implied: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_chains);
  const breadthMult = 1 + extraChains * model.breadth_per_chain;
  const base = protocol.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult));
  return { implied, growthPct, growthMult, maturityMult, breadthMult, age };
}

/**
 * Heat, 0-100: how hot a launch looks right now, from the snapshot alone.
 * Growth against its own category's median is worth up to 40 (a protocol
 * growing while its category shrinks is heating up); youth up to 20 (a
 * young listing is an earlier find); size against the watchlist floor up
 * to 15; chain breadth up to 10; strong absolute growth up to 15. Heat
 * never changes the implied value or the rank — it is the early-warning
 * view, and the early strip sorts by it.
 */
export function heatScore(protocol: SnapshotProtocol, asOf: string, categoryMedian: number | null, floorUsd: number): { score: number; band: 'Hot' | 'Warm' | 'Cool' | 'Cold' } {
  const growth = protocol.change_7d;
  const medianGrowth = categoryMedian ?? 0;
  const diff = growth === null ? 0 : growth - medianGrowth;
  const vsCategory = (40 * (Math.min(60, Math.max(-30, diff)) + 30)) / 90;
  const age = ageDays(asOf, protocol.listed_at);
  const youth = age === null ? 10 : 20 * (1 - Math.min(age, 730) / 730);
  const scale = 15 * Math.min(protocol.tvl_usd / floorUsd, 1);
  const breadth = (10 * Math.min(Math.max(protocol.chains.length - 1, 0), 4)) / 4;
  const absolute = growth === null ? 0 : growth > 25 ? 15 : growth > 10 ? 10 : growth > 0 ? 5 : 0;
  const score = Math.min(100, Math.max(0, Math.round(vsCategory + youth + scale + breadth + absolute)));
  const band = score >= 70 ? 'Hot' : score >= 45 ? 'Warm' : score >= 20 ? 'Cool' : 'Cold';
  return { score, band };
}

/**
 * Risk, 0-100, from the snapshot alone — never a honeypot or rug verdict.
 * Drawdown: growth below -20 adds 30, below -5 adds 15. Growth far below
 * its own category's median adds 10. Youth: listed under 90 days adds 25,
 * under 180 adds 15, unknown age adds 10. Single chain adds 10. TVL under
 * $10M adds 10. Holding most of its category's TVL adds 5. Strong growth
 * (over +20%) subtracts 10. No growth reported adds 5.
 */
export function riskScore(protocol: SnapshotProtocol, asOf: string, context?: { categoryMedian: number | null; categoryShare: number }): { score: number; band: 'Low' | 'Medium' | 'High'; flags: string[] } {
  const flags: string[] = [];
  let score = 0;
  const growth = protocol.change_7d;
  if (growth !== null && growth < -20) { score += 30; flags.push(`TVL down ${growth.toFixed(1)}% in 7 days`); }
  else if (growth !== null && growth < -5) { score += 15; flags.push(`TVL down ${growth.toFixed(1)}% in 7 days`); }
  if (growth !== null && growth > 20) score -= 10;
  if (growth === null) { score += 5; flags.push('No 7-day growth reported in the snapshot'); }
  const medianGrowth = context?.categoryMedian ?? null;
  if (growth !== null && medianGrowth !== null && growth - medianGrowth < -15) {
    score += 10;
    flags.push(`Growing ${(growth - medianGrowth).toFixed(1)} points slower than its ${(protocol.category ?? 'category')} median`);
  }
  const age = ageDays(asOf, protocol.listed_at);
  if (age === null) { score += 10; flags.push('Listing date unknown — age cannot be checked'); }
  else if (age < 90) { score += 25; flags.push(`Listed only ${age} days ago`); }
  else if (age < 180) { score += 15; flags.push(`Listed only ${age} days ago`); }
  if (protocol.chains.length <= 1) { score += 10; flags.push('Runs on a single chain'); }
  if (protocol.tvl_usd < 10_000_000) { score += 10; flags.push('TVL under $10M — thin liquidity'); }
  const share = context?.categoryShare ?? 0;
  if (share > 0.5) { score += 5; flags.push(`Holds ${Math.round(share * 100)}% of its category's TVL — one name carries the corner`); }
  score = Math.min(100, Math.max(0, score));
  const band = score >= 50 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  if (flags.length === 0) flags.push('No risk flag in the snapshot figures');
  return { score, band, flags };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories that are a wrapped, staked or bridged product of a token that trades, not a launch. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Exchange names: a protocol beginning with one is that exchange's product. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** A whole word `wrapped`, `staked` or `staking` in the name. */
const WRAPPED_OR_STAKED = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token and not a wrapped,
 * staked or bridged product of a token that already trades — the same rule
 * the snapshot's watchlist was built with, applied to the whole board, so
 * the top of the board is never WBTC or a staked-ETH product.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_OR_STAKED.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((e) => p.name.startsWith(e))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** Per-category figures from the snapshot itself: median growth and total TVL. */
function categoryFigures(snapshot: Snapshot): Map<string, { medianGrowth: number | null; totalTvl: number }> {
  const byCategory = new Map<string, SnapshotProtocol[]>();
  for (const p of snapshot.protocols) {
    const key = p.category ?? 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(p);
    byCategory.set(key, list);
  }
  const figures = new Map<string, { medianGrowth: number | null; totalTvl: number }>();
  for (const [key, list] of byCategory) {
    const growths = list.map((p) => p.change_7d).filter((g): g is number => g !== null);
    figures.set(key, {
      medianGrowth: median(growths),
      totalTvl: list.reduce((s, p) => s + p.tvl_usd, 0),
    });
  }
  return figures;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const figures = categoryFigures(snapshot);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names is ranked.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, at any TVL —
  // the whole point of the radar is to find launches before the floor does.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    const fig = figures.get(p.category ?? 'Other') ?? { medianGrowth: null, totalTvl: 0 };
    const share = fig.totalTvl > 0 ? p.tvl_usd / fig.totalTvl : 0;
    const r = riskScore(p, snapshot.as_of, { categoryMedian: fig.medianGrowth, categoryShare: share });
    const h = heatScore(p, snapshot.as_of, fig.medianGrowth, snapshot.floor_usd);
    return { p, ...v, risk: r, heat: h, medianGrowth: fig.medianGrowth };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const watch = new Set(snapshot.watchlist);
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: watch.has(s.p.slug),
    age_days: s.age,
    implied_value_usd: s.implied,
    risk_score: s.risk.score,
    risk_band: s.risk.band,
    risk_flags: s.risk.flags,
    heat_score: s.heat.score,
    heat_band: s.heat.band,
    category_median_growth: s.medianGrowth,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge') || c.includes('canonical')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('farm')) return `Deposit $${capital} into ${name}'s farm on ${chain} and compound the rewards weekly.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL
 * and age), never from a hand-written list of names. Multi-chain protocols
 * get a repeat step on their second chain; every plan ends with an exit
 * decided in advance, before any token launches.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const secondChain = p.chains.length > 1 ? p.chains[1]! : null;
  const steps: FarmStep[] = [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
  if (secondChain !== null) {
    steps.push({
      text: `Repeat the position on ${secondChain} as well, so the farm qualifies on both chains instead of one.`,
      cost: `the same $${capital} bridged over, about $5 of gas`,
      time: '20 minutes',
    });
  } else {
    steps.push({
      text: `Join the protocol's community channel and watch for points, testnet or snapshot announcements.`,
      cost: 'nothing to join',
      time: '10 minutes a week',
    });
  }
  steps.push({
    text: `Decide the exit before the token launches: what share to sell at launch and what to keep staked or in the pool.`,
    cost: 'nothing to decide now',
    time: '10 minutes',
  });
  return steps;
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    risk_score: row.risk_score,
    risk_band: row.risk_band,
    risk_flags: row.risk_flags,
    heat_score: row.heat_score,
    heat_band: row.heat_band,
    category_median_growth: row.category_median_growth,
    watchlist: row.watchlist,
  };
}

/** One category's momentum, from the board's own rows: median growth, size, and its strongest row. */
export function categoryStats(board: BoardRow[]): CategoryStat[] {
  const byCategory = new Map<string, BoardRow[]>();
  for (const row of board) {
    const key = row.category ?? 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(row);
    byCategory.set(key, list);
  }
  const stats: CategoryStat[] = [];
  for (const [category, rows] of byCategory) {
    const growths = rows.map((r) => r.change_7d).filter((g): g is number => g !== null);
    const top = rows.reduce((best, r) => (r.implied_value_usd > best.implied_value_usd ? r : best), rows[0]!);
    stats.push({
      category,
      protocols: rows.length,
      median_growth: median(growths),
      total_implied_usd: rows.reduce((s, r) => s + r.implied_value_usd, 0),
      top_slug: top.slug,
      top_name: top.name,
    });
  }
  stats.sort((a, b) => b.total_implied_usd - a.total_implied_usd);
  return stats.slice(0, CATEGORY_ROWS);
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
    categories: categoryStats(board),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

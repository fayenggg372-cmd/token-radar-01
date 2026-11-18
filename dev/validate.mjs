// Token Radar — local validation for radar-3.
//
// Runs the program twice into two scratch directories and compares every
// byte (the grader runs it twice and both runs must write the same bytes),
// then checks the seven gate rows the sealed scorer runs, plus the
// dashboard source budget the dossier's text cap allows.
//
//   node dev/validate.mjs
//
// Exits 0 when every row passes, 1 otherwise. No network, no kit CLI.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const kitInput = join(here, 'token-radar-01-kit', 'input', 'snapshot.json');
const snapshot = JSON.parse(readFileSync(kitInput, 'utf8'));
const slugs = new Set(snapshot.protocols.map((p) => p.slug));

const failures = [];
const notes = [];
function check(name, ok, detail) {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}
function note(text) { notes.push(text); console.log(`note  ${text}`); }

/** Run main.ts into `dir` and return its stdout. */
function runInto(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const out = execFileSync(process.execPath, [join(here, 'main.ts'), '--input', kitInput], {
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: dir },
    encoding: 'utf8',
  });
  return out;
}

/** Every file under `dir`, as paths relative to it. */
function walk(dir, base = dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path, base));
    else found.push(path.slice(base.length + 1));
  }
  return found.sort();
}

/** PNG dimensions out of the IHDR chunk, or null. */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const dirA = '/tmp/radar-validate-a';
const dirB = '/tmp/radar-validate-b';
const logA = runInto(dirA);
const logB = runInto(dirB);

// Determinism: both runs write the same bytes.
const filesA = walk(dirA);
const filesB = walk(dirB);
let same = filesA.length === filesB.length && filesA.every((f, i) => f === filesB[i]);
if (same) {
  for (const f of filesA) {
    if (!readFileSync(join(dirA, f)).equals(readFileSync(join(dirB, f)))) { same = false; break; }
  }
}
check('determinism', same, `${filesA.length} files, two runs`);

// Gate 1 — dashboard files.
const dashDir = join(dirA, 'dashboard');
const dashFiles = existsSync(dashDir) ? walk(dashDir) : [];
const dashBytes = dashFiles.reduce((s, f) => s + statSync(join(dashDir, f)).size, 0);
const hasHtml = dashFiles.some((f) => f === 'index.html');
const hasCss = dashFiles.some((f) => f.endsWith('.css'));
const hasJs = dashFiles.some((f) => f.endsWith('.js'));
const badName = dashFiles.find((f) => !/^[A-Za-z0-9._-]+$/.test(f) || f.startsWith('.') || f.startsWith('-') || f.length > 128);
let networkRef = null;
for (const f of dashFiles) {
  if (!/\.(html|css|js)$/.test(f)) continue;
  const text = readFileSync(join(dashDir, f), 'utf8');
  const hit = text.match(/(?:href|src|action)\s*=\s*"https?:\/\/|@import\s+['"]https?:\/\/|url\(\s*['"]?https?:\/\/|from\s+['"]https?:\/\/|import\(\s*['"]https?:\/\//);
  if (hit) { networkRef = `${f}: ${hit[0].slice(0, 40)}`; break; }
}
check('dashboard_files', hasHtml && hasCss && hasJs && dashFiles.length <= 400 && dashBytes <= 4_194_304 && !badName && !networkRef,
  `${dashFiles.length} files, ${dashBytes} bytes${networkRef ? `; network ref in ${networkRef}` : ''}`);
note(`dashboard source total ${dashFiles.filter((f) => /\.(html|css|js)$/.test(f)).reduce((s, f) => s + statSync(join(dashDir, f)).size, 0)} bytes of the 65,536 dossier text cap`);

// Gate 2 — board file.
const boardPath = join(dirA, 'board.json');
const boardBytes = statSync(boardPath).size;
const board = JSON.parse(readFileSync(boardPath, 'utf8'));
const rows = Array.isArray(board) ? board : board.rows;
let boardOk = Array.isArray(rows) && rows.length >= 100 && rows.length <= 4000 && boardBytes <= 8_388_608;
let boardDetail = `${rows.length} rows, ${boardBytes} bytes`;
if (boardOk) {
  const seen = new Set();
  for (const r of rows) {
    if (!slugs.has(r.slug)) { boardOk = false; boardDetail = `invented slug ${r.slug}`; break; }
    if (seen.has(r.slug)) { boardOk = false; boardDetail = `duplicate slug ${r.slug}`; break; }
    seen.add(r.slug);
    if (typeof r.name !== 'string' || r.name.length === 0) { boardOk = false; boardDetail = `${r.slug} has no name`; break; }
    if (!Number.isSafeInteger(r.rank) || r.rank <= 0) { boardOk = false; boardDetail = `${r.slug} rank ${r.rank}`; break; }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 100_000_000_000_000) { boardOk = false; boardDetail = `${r.slug} implied ${r.implied_value_usd}`; break; }
    if (!Array.isArray(r.farm_steps)) { boardOk = false; boardDetail = `${r.slug} has no farm_steps`; break; }
  }
}
check('board_file', boardOk, boardDetail);

// Gate 3 — sorted by value.
const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
let sortedOk = ranks.every((r, i) => r === i + 1);
let sortedDetail = `ranks 1..${rows.length}`;
if (sortedOk) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].implied_value_usd > rows[i - 1].implied_value_usd) { sortedOk = false; sortedDetail = `row ${i + 1} outranks row ${i}`; break; }
  }
}
if (sortedOk && rows.length >= 2 && rows[0].implied_value_usd === rows[rows.length - 1].implied_value_usd) {
  sortedOk = false; sortedDetail = 'all rows share one implied value';
}
check('sorted_by_value', sortedOk, sortedDetail);

// Gate 4 — coverage.
const rowSlugs = new Set(rows.map((r) => r.slug));
const missing = snapshot.watchlist.filter((s) => !rowSlugs.has(s));
check('coverage', missing.length === 0, `${snapshot.watchlist.length} watchlist slugs, ${missing.length} missing`);

// Gate 5 — farm steps.
let farmOk = true;
let farmDetail = `${rows.length} rows, 8 steps each`;
for (const r of rows) {
  const steps = r.farm_steps;
  if (steps.length < 3 || steps.length > 12) { farmOk = false; farmDetail = `${r.slug} has ${steps.length} steps`; break; }
  for (const s of steps) {
    const t = s.trim();
    if (t.length < 20 || t.length > 600) { farmOk = false; farmDetail = `${r.slug} step of ${t.length} chars`; break; }
  }
  if (!farmOk) break;
}
check('farm_steps', farmOk, farmDetail);

// Gate 6 — screenshots.
const shotDir = join(dirA, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir).filter((n) => !n.startsWith('.')).sort() : [];
let shotOk = shots.length >= 3 && shots.length <= 4;
let shotDetail = `${shots.length} images`;
if (shotOk) {
  for (const name of shots) {
    const buf = readFileSync(join(shotDir, name));
    const size = buf.length;
    const dims = pngSize(buf);
    if (size > 524_288) { shotOk = false; shotDetail = `${name} is ${size} bytes`; break; }
    if (!dims) { shotOk = false; shotDetail = `${name} is not a whole PNG`; break; }
    const long = Math.max(dims.width, dims.height);
    const short = Math.min(dims.width, dims.height);
    if (long > 1440 || short < 800) { shotOk = false; shotDetail = `${name} is ${dims.width}x${dims.height}`; break; }
    shotDetail = `${shots.length} images, ${dims.width}x${dims.height} each, largest ${Math.max(...shots.map((n) => statSync(join(shotDir, n)).size))} bytes`;
  }
}
check('screenshots', shotOk, shotDetail);

// Gate 7 — dossier matches: rebuild it from this output and compare bytes.
// buildDossier returns bytes (a Uint8Array); main.ts writes those bytes.
const { buildDossier } = await import(join(here, 'vendor', 'makefun-board.ts'));
const rebuilt = Buffer.from(buildDossier(dirA, { text_max_bytes: 65_536, screenshots: { max: 4, max_bytes: 524_288 }, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));
const dossierPath = join(dirA, 'dossier.json');
const dossierOk = readFileSync(dossierPath).equals(rebuilt);
check('dossier_matches', dossierOk, `${statSync(dossierPath).size} bytes${dossierOk ? '' : ' — rebuilt dossier differs'}`);

// data.js agrees with board.json: same rows, same implied values, heat present.
const dataText = readFileSync(join(dirA, 'data.js'), 'utf8');
const data = JSON.parse(dataText.replace(/^window\.RADAR=/, '').replace(/;\s*$/, ''));
let dataOk = data.rows.length === rows.length && data.model_version === 'radar-3';
let dataDetail = `${data.rows.length} rows in data.js, model ${data.model_version}`;
if (dataOk) {
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    const b = data.rows[i];
    if (a.slug !== b.slug || a.implied_value_usd !== b.implied_value_usd || typeof b.heat_score !== 'number' || !b.heat_band) {
      dataOk = false; dataDetail = `row ${i} disagrees between board.json and data.js`; break;
    }
  }
}
check('data_agrees', dataOk, dataDetail);
note(`categories in data.js: ${data.categories.length}; hottest early: ${data.rows.filter((r) => !r.watchlist).sort((a, b) => b.heat_score - a.heat_score).slice(0, 3).map((r) => `${r.name} ${r.heat_score}`).join(', ')}`);

console.log(failures.length === 0 ? 'validate: all checks passed' : `validate: ${failures.length} check(s) failed: ${failures.join(', ')}`);
process.exit(failures.length === 0 ? 0 : 1);

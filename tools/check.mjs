#!/usr/bin/env node
// Project check. Owned by: supervisor.
//   node tools/check.mjs                 syntax + import/export resolution for every src file
//   node tools/check.mjs --team action   ...plus: fail if commits ahead of origin/main touch files the team doesn't own
// Zero dependencies. Run before every ship (tools/ship.sh runs it for you).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

const files = walk(join(root, 'src'));
const exportsOf = new Map();

function exportedNames(file) {
  if (exportsOf.has(file)) return exportsOf.get(file);
  const src = readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.add(n);
    }
  }
  if (/export\s+default\b/.test(src)) names.add('default');
  exportsOf.set(file, names);
  return names;
}

for (const file of files) {
  const rel = relative(root, file);
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) { errors.push(`${rel}: syntax error\n${r.stderr.split('\n').slice(0, 6).join('\n')}`); continue; }
  const src = readFileSync(file, 'utf8');
  const re = /import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?(?:\*\s+as\s+[\w$]+)?\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const [, def, named, spec] = m;
    if (!spec.startsWith('.')) { errors.push(`${rel}: bare import "${spec}" — no packages allowed (no build step)`); continue; }
    const target = resolve(dirname(file), spec);
    if (!existsSync(target)) { errors.push(`${rel}: imports missing file ${spec}`); continue; }
    const have = exportedNames(target);
    if (def && !have.has('default')) errors.push(`${rel}: ${spec} has no default export`);
    for (const part of (named || '').split(',')) {
      const n = part.trim().split(/\s+as\s+/)[0].trim();
      if (n && !have.has(n)) errors.push(`${rel}: ${spec} does not export "${n}"`);
    }
  }
}

// Ownership check
const ti = process.argv.indexOf('--team');
if (ti > 0) {
  const team = process.argv[ti + 1];
  const owners = JSON.parse(readFileSync(join(root, 'OWNERS.json'), 'utf8'));
  if (!owners[team]) errors.push(`unknown team "${team}" (see OWNERS.json)`);
  else if (team !== 'supervisor') {
    const toRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§').replace(/\*/g, '[^/]*').replace(/§/g, '.*') + '$');
    const mine = owners[team].map(toRe);
    let changed = [];
    try {
      const base = execSync('git merge-base HEAD origin/main', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      changed = execSync(`git diff --name-only ${base} HEAD`, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch { /* no origin/main yet */ }
    for (const f of changed) {
      if (!mine.some((r) => r.test(f))) errors.push(`ownership: team "${team}" changed ${f}, which it does not own. Revert it and ask the supervisor.`);
    }
  }
}

if (errors.length) {
  console.error(`check: ${errors.length} problem(s)\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log(`check: ok (${files.length} files)`);

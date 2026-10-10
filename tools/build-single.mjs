// Builds dist/housewarming.html: the whole game in ONE file (JS bundled, photos inlined as data URIs),
// so it can be emailed and opened by double-clicking, no server needed.
// Usage: node tools/build-single.mjs   (needs network once for `npx esbuild`)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { MANIFEST } from '../src/core/assets.js';

const root = new URL('..', import.meta.url).pathname;
let js = execFileSync('npx', ['-y', 'esbuild', 'src/main.js', '--bundle', '--format=iife', '--minify', '--log-level=warning'], { cwd: root, maxBuffer: 64 << 20 }).toString();

for (const path of Object.values(MANIFEST)) {
  const mime = path.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const uri = `data:${mime};base64,${readFileSync(root + path).toString('base64')}`;
  if (!js.includes(`"${path}"`)) throw new Error(`asset path not found in bundle: ${path}`);
  js = js.split(`"${path}"`).join(`"${uri}"`);
}
js = js.replace(/<\/script/gi, '<\\/script');

const html = readFileSync(root + 'index.html', 'utf8')
  .replace(/<script type="module" src="src\/main.js"><\/script>/, () => `<script>\n${js}\n</script>`);
if (html.includes('src/main.js')) throw new Error('script tag not replaced');
mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'dist/housewarming.html', html);
console.log(`dist/housewarming.html  ${(html.length / 1024 / 1024).toFixed(2)} MB`);

/**
 * strip-gsub.mjs
 *
 * Patches each TTF in public/fonts/ by renaming the "GSUB" tag to "XSUB"
 * in the font's table directory. fontkit (used by @react-pdf/renderer) looks
 * up tables by exact tag name — "XSUB" is never queried, so ligature
 * substitutions (fi, fl, ff, etc.) are never applied.
 *
 * Run: node scripts/strip-gsub.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir  = join(__dirname, '..', 'public', 'fonts');

const ttfFiles = readdirSync(fontsDir).filter(f => f.endsWith('.ttf'));

let patched = 0;
let skipped = 0;

for (const filename of ttfFiles) {
  const filePath = join(fontsDir, filename);
  const sizeBefore = statSync(filePath).size;
  const buf = readFileSync(filePath);

  const numTables = buf.readUInt16BE(4);
  let found = false;

  for (let i = 0; i < numTables; i++) {
    const entryOffset = 12 + i * 16;
    const tag = buf.toString('ascii', entryOffset, entryOffset + 4);
    if (tag === 'GSUB') {
      buf.write('XSUB', entryOffset, 4, 'ascii');
      found = true;
      break;
    }
  }

  writeFileSync(filePath, buf);
  const sizeAfter = statSync(filePath).size;

  if (found) {
    console.log(`  [PATCHED] ${filename}  ${sizeBefore} bytes → ${sizeAfter} bytes  (GSUB → XSUB)`);
    patched++;
  } else {
    console.log(`  [SKIP]    ${filename}  ${sizeBefore} bytes  (no GSUB table found)`);
    skipped++;
  }
}

console.log(`\nDone: ${patched} patched, ${skipped} skipped.`);

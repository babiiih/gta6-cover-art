// Neon Vice entry point for gta6-cover-art-01.
//
// The deliverable is the static web app in app/ (plain HTML, CSS and ES
// modules, no build step, no network). This program's job is only delivery:
// copy app/ and screenshots/ into the output directory and write the
// dossier.json summary there with the vendored make.fun library.
//
// Run it the way the grader does, or locally with an override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own limits, mirrored here so this program refuses anything the
// scorer would refuse anyway: dossier text cap, screenshot count and size,
// and the app tree's file count, byte total and longest path.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function copyTree(folderName) {
  const from = join(repoDir, folderName);
  const into = join(outputDir, folderName);
  mkdirSync(into, { recursive: true });
  if (existsSync(from)) cpSync(from, into, { recursive: true });
  return into;
}

function checkScreenshots(dir) {
  const names = readdirSync(dir).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
  if (names.length === 0) throw new Error('screenshots/: at least one PNG or JPEG screenshot is required');
  if (names.length > GATE_LIMITS.screenshots.max) {
    throw new Error(`screenshots/: ${names.length} images, over the ${GATE_LIMITS.screenshots.max} allowed`);
  }
  return names;
}

mkdirSync(outputDir, { recursive: true });
copyTree('app');
const shotsDir = copyTree('screenshots');
const shotNames = checkScreenshots(shotsDir);
console.log(`Neon Vice: copied app/ and ${shotNames.length} screenshots (${shotNames.join(', ')}) to ${outputDir}`);

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, GATE_LIMITS));
console.log('Neon Vice: dossier.json written');

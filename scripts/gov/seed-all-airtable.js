// scripts/gov/seed-all-airtable.js
/* eslint-disable no-console */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate locations (first existing wins).
function candidates(base) {
  const cwd = process.cwd();
  return [
    path.join(cwd, `${base}.js`), // repo root (flat)
    path.join(cwd, 'scripts', `${base}.js`), // scripts/
    path.join(cwd, 'scripts', 'gov', `${base}.js`), // scripts/gov/
    path.join(__dirname, `${base}.js`), // alongside this orchestrator
  ];
}
function findFirstExisting(label, base, overridePath) {
  if (overridePath) {
    const p = path.isAbsolute(overridePath)
      ? overridePath
      : path.resolve(process.cwd(), overridePath);
    if (!fs.existsSync(p)) {
      console.error(`✖ ${label} override not found: ${p}`);
      process.exit(1);
    }
    return p;
  }
  for (const c of candidates(base)) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// CLI
const argv = process.argv.slice(2);
const passthroughIndex = argv.indexOf('--');
const passthroughArgs = passthroughIndex >= 0 ? argv.slice(passthroughIndex + 1) : [];
const ownArgs = passthroughIndex >= 0 ? argv.slice(0, passthroughIndex) : argv;

let runNational = false,
  runProvincial = false,
  runMunicipal = false,
  continueOnError = false;
const getFlagPath = (name) => {
  const i = ownArgs.findIndex((a) => a.startsWith(`--${name}=`));
  if (i < 0) return null;
  return ownArgs[i].split('=').slice(1).join('=');
};

for (const a of ownArgs) {
  if (a === '--national') runNational = true;
  else if (a === '--provincial') runProvincial = true;
  else if (a === '--municipal') runMunicipal = true;
  else if (a === '--continue-on-error') continueOnError = true;
}
// default: all
if (!runNational && !runProvincial && !runMunicipal)
  runNational = runProvincial = runMunicipal = true;

// Resolve script paths (flat-first)
const natPath = runNational
  ? findFirstExisting('National', 'seed-national-airtable', getFlagPath('national-file'))
  : null;
const provPath = runProvincial
  ? findFirstExisting('Provincial', 'seed-provincial-airtable', getFlagPath('provincial-file'))
  : null;
const muniPath = runMunicipal
  ? findFirstExisting('Municipal', 'seed-municipal-airtable', getFlagPath('municipal-file'))
  : null;

const PLAN = [];
if (runNational) {
  if (!natPath) {
    console.error(
      '✖ National script not found. Looked for:\n  ' +
        candidates('seed-national-airtable').join('\n  '),
    );
    process.exit(1);
  }
  PLAN.push(['National', natPath]);
}
if (runProvincial) {
  if (!provPath) {
    console.error(
      '✖ Provincial script not found. Looked for:\n  ' +
        candidates('seed-provincial-airtable').join('\n  '),
    );
    process.exit(1);
  }
  PLAN.push(['Provincial', provPath]);
}
if (runMunicipal) {
  if (!muniPath) {
    console.error(
      '✖ Municipal script not found. Looked for:\n  ' +
        candidates('seed-municipal-airtable').join('\n  '),
    );
    process.exit(1);
  }
  PLAN.push(['Municipal', muniPath]);
}

function runScript([label, filePath]) {
  return new Promise((resolve, reject) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`▶ ${label.toUpperCase()}`);
    console.log(`  Path: ${filePath}`);
    console.log(
      `  Cmd : node ${path.relative(process.cwd(), filePath)} ${passthroughArgs.join(' ')}`,
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const child = spawn(process.execPath, [filePath, ...passthroughArgs], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✔ ${label} completed.`);
        resolve();
      } else {
        console.error(`✖ ${label} failed (exit ${code}).`);
        continueOnError ? resolve() : reject(new Error(`${label} failed`));
      }
    });
    child.on('error', (err) => {
      console.error(`✖ ${label} failed to start:`, err);
      continueOnError ? resolve() : reject(err);
    });
  });
}

(async function main() {
  console.log('SOVOPS SEED ORCHESTRATOR');
  console.log(
    `Mode: ${process.env.AIRTABLE_MODE || 'append'} | Base: ${process.env.AIRTABLE_BASE_ID || '(unset)'}`,
  );
  if (passthroughArgs.length) console.log(`Pass-through: ${JSON.stringify(passthroughArgs)}`);
  if (continueOnError) console.log('Continue-on-error: ENABLED');

  for (const step of PLAN) await runScript(step);
  console.log('\nAll requested stages finished.');
})().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});

/// <reference types="node" />

import { readFile, writeFile } from 'node:fs/promises';

const rawMilestone = process.env.MILESTONE;
const milestone = rawMilestone?.trim();
const packageJsonPath = new URL('../extension/package.json', import.meta.url);
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

if (!milestone) {
  delete packageJson.milestone;
} else if (!/^\d+$/.test(milestone) || Number(milestone) <= 0) {
  throw new Error(`Invalid MILESTONE '${rawMilestone}'. It must be a positive integer.`);
} else {
  packageJson.milestone = milestone;
}
await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

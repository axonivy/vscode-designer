/// <reference types="node" />

import { readFile, writeFile } from 'node:fs/promises';

const milestone = process.env.MILESTONE;

if (milestone !== undefined && milestone.trim() !== '') {
  const intMilestone = parseInt(milestone);
  if (isNaN(intMilestone) || intMilestone <= 0) {
    throw new Error(`Invalid MILESTONE '${milestone}'. It must be a positive integer.`);
  }
  const packageJsonPath = new URL('../extension/package.json', import.meta.url);
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  packageJson.milestone = milestone;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

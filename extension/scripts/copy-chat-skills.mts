import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = resolve('src/ai/skills/yaml-files/SKILL.md');
const target = resolve('skills/yaml-files/SKILL.md');

await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);

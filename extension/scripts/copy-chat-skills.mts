import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('src/ai/skills');
const target = resolve('skills');

await cp(source, target, { recursive: true });

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const schemaIndexes = ['https://json-schema.axonivy.com/14.0/config/', 'https://json-schema.axonivy.com/14.0/project/'];

const skillsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/ai/skills');
const cacheRoots: Record<string, string> = {
  config: path.join(skillsRoot, 'ivy-yaml-files/schemas/14.0/config'),
  project: path.join(skillsRoot, 'ivy-json-files/schemas/14.0/project')
};
const legacyCacheRoot = path.join(skillsRoot, 'schemas/14.0');

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function listedJsonFiles(index: string, indexUrl: string): string[] {
  const root = new URL(indexUrl);
  const files = new Set<string>();
  for (const [, href] of index.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    if (!href) {
      continue;
    }
    const candidate = new URL(href, root);
    if (candidate.origin === root.origin && candidate.pathname.startsWith(root.pathname) && candidate.pathname.endsWith('.json')) {
      files.add(candidate.pathname.slice(root.pathname.length));
    }
  }
  return [...files];
}

function validateSchema(content: string, url: string): string {
  const schema: unknown = JSON.parse(content);
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`Invalid JSON schema response from ${url}`);
  }
  return `${content.trimEnd()}\n`;
}

async function fetchIndexSchemas(indexUrl: string): Promise<{ relativePath: string; content: string }[]> {
  const index = await fetchText(indexUrl);
  const directory = new URL(indexUrl).pathname.split('/').filter(Boolean).at(-1);
  if (!directory) {
    throw new Error(`Invalid schema index URL: ${indexUrl}`);
  }

  return Promise.all(
    listedJsonFiles(index, indexUrl).map(async file => {
      const url = new URL(file, indexUrl).href;
      const content = validateSchema(await fetchText(url), url);
      return { relativePath: path.join(directory, file), content };
    })
  );
}

async function generateIvySchemas(): Promise<void> {
  const files = (await Promise.all(schemaIndexes.map(fetchIndexSchemas))).flat();
  if (files.length === 0) {
    throw new Error('No JSON schemas found in the Axon Ivy schema indexes.');
  }

  await Promise.all([...Object.values(cacheRoots), legacyCacheRoot].map(cacheRoot => rm(cacheRoot, { recursive: true, force: true })));
  await Promise.all(
    files.map(async ({ relativePath, content }) => {
      const [directory, file] = relativePath.split(path.sep);
      const cacheRoot = directory ? cacheRoots[directory] : undefined;
      if (!cacheRoot || !file) {
        throw new Error(`Unexpected schema path: ${relativePath}`);
      }
      const destination = path.join(cacheRoot, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
    })
  );
  console.log(`[ivy-schemas] Generated ${files.length} schema(s).`);
}

await generateIvySchemas();

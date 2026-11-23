import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/ai/skills');
const schemaVersion = process.env.IVY_SCHEMA_VERSION ?? '14.0';
const schemaIndexes = ['config', 'project', 'market'].map(directory => `https://json-schema.axonivy.com/${schemaVersion}/${directory}/`);
const schemaRoots: Record<string, string> = {
  config: path.join(skillsRoot, 'ivy-yaml-files/schemas'),
  project: path.join(skillsRoot, 'ivy-json-files/schemas'),
  market: path.join(skillsRoot, 'ivy-market/schemas')
};
const cacheRoots: Record<string, string> = {
  config: path.join(schemaRoots.config, 'config'),
  project: path.join(schemaRoots.project, 'project'),
  market: path.join(schemaRoots.market, 'market')
};
const legacyCacheRoot = path.join(skillsRoot, 'schemas');

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

function parseSchema(content: string, source: string): unknown {
  const schema: unknown = JSON.parse(content);
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`Invalid JSON schema in ${source}`);
  }
  return schema;
}

function validateSchema(content: string, url: string): string {
  return JSON.stringify(parseSchema(content, url));
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

async function fetchIvySchemas(): Promise<{ relativePath: string; content: string }[]> {
  const files = (await Promise.all(schemaIndexes.map(fetchIndexSchemas))).flat();
  if (files.length === 0) {
    throw new Error('No JSON schemas found in the Axon Ivy schema indexes.');
  }
  return files;
}

async function generateIvySchemas(): Promise<void> {
  const files = await fetchIvySchemas();
  await Promise.all([...Object.values(schemaRoots), legacyCacheRoot].map(cacheRoot => rm(cacheRoot, { recursive: true, force: true })));
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
  console.log(`[ivy-schemas] Generated ${files.length} schema(s) for ${schemaVersion}.`);
}

async function localSchemaFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter(entry => entry.isFile() && entry.name.endsWith('.json')).map(entry => path.join(root, entry.name));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function checkIvySchemas(): Promise<void> {
  const files = await fetchIvySchemas();
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'ivy-schema-check-'));
  const localRoot = path.join(tempRoot, 'local');
  const hostedRoot = path.join(tempRoot, 'hosted');

  try {
    for (const { relativePath, content } of files) {
      const destination = path.join(hostedRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, `${JSON.stringify(parseSchema(content, relativePath), null, 2)}\n`);
    }

    await Promise.all(
      Object.entries(cacheRoots).map(async ([directory, root]) => {
        const localFiles = await localSchemaFiles(root);
        await Promise.all(
          localFiles.map(async source => {
            const relativePath = path.join(directory, path.basename(source));
            const destination = path.join(localRoot, relativePath);
            await mkdir(path.dirname(destination), { recursive: true });
            const content = await readFile(source, 'utf8');
            await writeFile(destination, `${JSON.stringify(parseSchema(content, source), null, 2)}\n`);
          })
        );
      })
    );

    const result = spawnSync('diff', ['-ru', 'local', 'hosted'], { cwd: tempRoot, stdio: 'inherit' });
    if (result.error) {
      throw result.error;
    }
    if (result.status === 1) {
      throw new Error('Skill schemas differ from the hosted schemas.');
    }
    if (result.status !== 0) {
      throw new Error(`Schema diff failed with exit code ${result.status}.`);
    }
    console.log(`[ivy-schemas] All ${files.length} schema(s) match the hosted ${schemaVersion} schemas.`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

if (process.env.SKIP_IVY_SCHEMAS) {
  console.log('[ivy-schemas] SKIP_IVY_SCHEMAS is set, keeping the committed schemas.');
} else if (process.argv.includes('--check')) {
  await checkIvySchemas();
} else {
  await generateIvySchemas();
}

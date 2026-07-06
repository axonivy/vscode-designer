import { build } from 'esbuild';
import { glob } from 'glob';

async function main() {
  const testFiles = await glob('src/test-integration/suite/**/*.ts');

  await build({
    entryPoints: ['src/test-integration/runTest.ts', 'src/test-integration/suite/index.ts', ...testFiles],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outdir: 'dist-test-integration',
    outbase: 'src/test-integration',
    external: ['vscode', 'mocha', '@vscode/test-electron'],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    },
    sourcemap: true
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

import { exec } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const projectPath = path.resolve(import.meta.dirname, '../workspaces/minimalProject');
const iarPath = path.resolve(import.meta.dirname, '../../test-results/ivy-project.iar');

export const buildTestIar = async (): Promise<void> => {
  await mkdir(path.dirname(iarPath), { recursive: true });
  await execAsync(
    [
      'mvn',
      '--quiet',
      'com.axonivy.ivy.ci:project-build-plugin:pack-iar',
      `"-Divy.output.directory=${path.dirname(iarPath)}"`,
      '-Divy.final.name=ivy-project'
    ].join(' '),
    { cwd: projectPath }
  );
};

export const copyTestIar = async (targetPath: string, targetFilename: string): Promise<void> => {
  if (path.extname(targetFilename) !== '.iar') {
    throw new Error(`Target filename must have .iar extension: ${targetFilename}`);
  }
  await mkdir(targetPath, { recursive: true });
  await copyFile(iarPath, path.resolve(targetPath, targetFilename));
};

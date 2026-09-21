import { execFile } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectPath = path.resolve(import.meta.dirname, '../workspaces/minimalProject');
const iarPath = path.resolve(import.meta.dirname, '../../test-results/ivy-project.iar');

export const buildTestIar = async (): Promise<void> => {
  await mkdir(path.dirname(iarPath), { recursive: true });
  const mavenExecutable = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'mvn';
  const mavenArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'mvn.cmd'] : [];
  await execFileAsync(mavenExecutable, [
    ...mavenArgs,
    '--quiet',
    '--file',
    path.join(projectPath, 'pom.xml'),
    'com.axonivy.ivy.ci:project-build-plugin:pack-iar',
    `-Divy.output.directory=${path.dirname(iarPath)}`,
    '-Divy.final.name=ivy-project'
  ]);
};

export const copyTestIar = async (targetPath: string, targetFilename: string): Promise<void> => {
  if (path.extname(targetFilename) !== '.iar') {
    throw new Error(`Target filename must have .iar extension: ${targetFilename}`);
  }
  await mkdir(targetPath, { recursive: true });
  await copyFile(iarPath, path.resolve(targetPath, targetFilename));
};

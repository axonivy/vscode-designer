import { cp, mkdtemp } from 'fs/promises';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectPath = path.resolve(import.meta.dirname, '../workspaces/minimalProject');
const iarPath = path.resolve(import.meta.dirname, '../../test-results/ivy-project.iar');
export const testIarCoordinates = { groupId: 'prebuiltProject', artifactId: 'prebuiltProject', version: '1.0.0-SNAPSHOT' };
export const testIarProject = { artifactId: testIarCoordinates.artifactId, version: testIarCoordinates.version };

export const buildTestIar = async (sourceProjectPath = projectPath): Promise<void> => {
  await mkdir(path.dirname(iarPath), { recursive: true });
  const buildProjectPath = await mkdtemp(path.join(os.tmpdir(), 'axonivy-playwright-iar-'));
  try {
    await cp(sourceProjectPath, buildProjectPath, { recursive: true });
    await execFileAsync(
      'mvn',
      [
        '--quiet',
        'com.axonivy.ivy.ci:project-build-plugin:pack-iar',
        `-Divy.output.directory=${path.dirname(iarPath)}`,
        '-Divy.final.name=ivy-project'
      ],
      { cwd: buildProjectPath }
    );
  } finally {
    await rm(buildProjectPath, { recursive: true, force: true });
  }
};

export const copyTestIar = async (targetPath: string, targetFilename: string): Promise<void> => {
  if (path.extname(targetFilename) !== '.iar') {
    throw new Error(`Target filename must have .iar extension: ${targetFilename}`);
  }
  await mkdir(targetPath, { recursive: true });
  await copyFile(iarPath, path.resolve(targetPath, targetFilename));
};

export const installTestIar = async () => {
  await execFileAsync(
    'mvn',
    [
      '--quiet',
      'install:install-file',
      `-Dfile=${iarPath}`,
      `-DgroupId=${testIarCoordinates.groupId}`,
      `-DartifactId=${testIarCoordinates.artifactId}`,
      `-Dversion=${testIarCoordinates.version}`,
      '-Dpackaging=iar',
      '-DgeneratePom=true'
    ]
  );
};

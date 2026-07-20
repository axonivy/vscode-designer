import fs, { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'path';

export const downloadIar = async (
  targetPath: string,
  targetFilename: string,
  url?: string,
  logger?: (message: string) => void
): Promise<void> => {
  logger = logger ?? console.log;
  if (path.extname(targetFilename) !== '.iar') {
    throw new Error(`Target filename must have .iar extension: ${targetFilename}`);
  }
  const targetPathAbs = path.resolve(path.join(targetPath, targetFilename));

  url =
    url ??
    'https://jenkins.ivyteam.io/job/demo-projects/job/master/lastSuccessfulBuild/artifact/connectivity/connectivity-demos/target/connectivity-demos-14.0.0-SNAPSHOT.iar';

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download IAR failed with status code ${response.status} ${response.statusText}`);
  }

  try {
    const parentDir = path.dirname(targetPathAbs);
    if (!fs.existsSync(parentDir)) {
      logger(`Parent directory does not exist, will be created: ${parentDir}`);
      await mkdir(parentDir, { recursive: true });
    }

    logger(`Writing IAR file to: ${targetPathAbs}`);
    await pipeline(response.body as unknown as NodeJS.ReadableStream, createWriteStream(targetPathAbs));
  } catch (error) {
    const systemError = error as NodeJS.ErrnoException;
    const errorCode = systemError.code ? ` (${systemError.code})` : '';
    throw new Error(`Failed to write IAR at ${targetPathAbs}${errorCode}: ${systemError.message}`, {
      cause: error
    });
  }
};

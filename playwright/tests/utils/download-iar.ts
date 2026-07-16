import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { emptyDownloadIarFilenameUpToDate as targetIarFilename, empty as targetIarPath } from '../workspaces/workspace';

const downloadIar = async (
  urlZipContainingIars: string,
  patternsMustContain: string[],
  logger: (message: string) => void
): Promise<void> => {
  const targetPath = path.join(targetIarPath, targetIarFilename);
  const response = await fetch(urlZipContainingIars);
  if (!response.ok) {
    throw new Error(`Download IAR failed with status code ${response.status}`);
  }
  const zipBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);
  let iarFileToCopy = null;
  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    const zipPathFilename = path.basename(zipPath);
    if (zipEntry.dir) continue;
    if (!zipPath.toLowerCase().endsWith('.iar')) continue;
    if (patternsMustContain.every(substr => zipPathFilename.includes(substr))) {
      logger(`Found matching IAR file: ${zipPath} with filename ${zipPathFilename}`);
      iarFileToCopy = {
        path: zipPath,
        filename: zipPathFilename,
        content: await zipEntry.async('uint8array')
      };
    }
  }

  if (!iarFileToCopy) {
    throw new Error(`No IAR file in ZIP found containing all patterns ${patternsMustContain}`);
  }

  try {
    logger(`Writing IAR file to: ${targetPath}`);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, Buffer.from(iarFileToCopy.content));
  } catch (error) {
    const systemError = error as NodeJS.ErrnoException;
    const errorCode = systemError.code ? ` (${systemError.code})` : '';
    throw new Error(`Failed to write IAR at ${targetPath}${errorCode}: ${systemError.message}`, {
      cause: error
    });
  }
};

export const runDownloadIar = async () => {
  console.log('runDownloadIar: process.argv: ' + process.argv.join('\n'));
  console.log('runDownloadIar: process.env: ' + JSON.stringify(process.env, null, 2));

  const url = process.env.IAR_DOWNLOAD_URL
    ? process.env.IAR_DOWNLOAD_URL
    : 'https://jenkins.ivyteam.io/job/demo-projects/job/master/lastSuccessfulBuild/artifact/connectivity/connectivity-demos/target/*zip*/target.zip';
  const rawPattern = process.env.IAR_FILE_MUST_CONTAIN ? process.env.IAR_FILE_MUST_CONTAIN : 'connectivity-demos,SNAPSHOT';
  try {
    const patterns = rawPattern
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    await downloadIar(url, patterns, console.log);
  } catch (error) {
    console.error('Failed to download IAR');
    console.error('URL: ' + url);
    console.error('Filename patterns: ' + rawPattern);
    console.error('Error:', error);
  }
};

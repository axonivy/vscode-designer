import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const downloadIar = async (
  urlZipContainingIars: string,
  filenameMustContain: string[],
  targetDir: string,
  targetFilename: string,
  logger: (message: string) => void
): Promise<void> => {
  logger('CWD: ' + process.cwd());
  logger('ZIP URL: ' + urlZipContainingIars);
  logger('IAR filename must contain patterns: ' + filenameMustContain);
  logger('Target directory: ' + targetDir);
  logger('Target filename: ' + targetFilename);

  const targetPath = path.join(process.cwd(), targetDir, targetFilename + '.iar');

  logger('Target path for IAR file: ' + targetPath);

  const response = await fetch(urlZipContainingIars);
  if (!response.ok) {
    return Promise.reject(`Download IAR failed with status code ${response.status}`);
  }

  logger('Response object: ' + JSON.stringify(response));
  logger('Response status: ' + response.status);
  logger('Response URL: ' + response.url);

  const zipBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);
  let iarFileToCopy = null;
  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    const zipPathFilename = path.basename(zipPath);
    if (zipEntry.dir) continue;
    if (!zipPath.toLowerCase().endsWith('.iar')) continue;
    if (filenameMustContain.every(substr => zipPathFilename.includes(substr))) {
      logger(`Found matching IAR file: ${zipPath} with filename ${zipPathFilename}`);
      iarFileToCopy = {
        path: zipPath,
        filename: zipPathFilename,
        content: await zipEntry.async('uint8array')
      };
    }
  }

  if (!iarFileToCopy) {
    throw new Error(`No IAR file in ZIP found containing all patterns ${filenameMustContain}`);
  }

  try {
    logger('Creating directory for IAR file if not exist: ' + targetPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    logger(`Writing IAR file to: ${targetPath}`);
    await fs.promises.writeFile(targetPath, Buffer.from(iarFileToCopy.content));
  } catch (error) {
    const systemError = error as NodeJS.ErrnoException;
    const errorCode = systemError.code ? ` (${systemError.code})` : '';
    throw new Error(`Failed to create directory or write IAR at ${targetPath}${errorCode}: ${systemError.message}`, {
      cause: error
    });
  }
};

export const runDownloadIar = async () => {
  console.log('runDownloadIar : All process.env:', process.env);
  console.log('runDownloadIar : All process.argv:', process.argv);

  try {
    const url = process.argv[2]
      ? process.argv[2]
      : 'https://jenkins.ivyteam.io/job/demo-projects/job/master/lastSuccessfulBuild/artifact/connectivity/connectivity-demos/target/*zip*/target.zip';
    const rawPattern = process.argv[3] ? process.argv[3] : 'connectivity-demos,SNAPSHOT';
    const patterns = rawPattern
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const targetDir = process.argv[4] ? process.argv[4] : 'tests/workspaces/empty/resources';
    const targetFilename = process.argv[5] ? process.argv[5] : 'ivy-project-up-to-date';
    await downloadIar(url, patterns, targetDir, targetFilename, console.log);
  } catch (error) {
    console.error('Failed to download IAR:', error);
  }
};

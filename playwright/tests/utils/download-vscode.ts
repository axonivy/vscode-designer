import { downloadAndUnzipVSCode, type DownloadOptions } from '@vscode/test-electron';

const downloadVersion: DownloadOptions['version'] = process.env.RUN_STABLE_VERSION === 'true' ? 'stable' : 'insiders';

export const runDownloadAndUnzipVSCode = async () => {
  await downloadAndUnzipVSCode({ version: downloadVersion });
};

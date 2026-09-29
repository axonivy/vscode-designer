import { downloadAndUnzipVSCode } from '@vscode/test-electron';

export const runDownloadAndUnzipVSCode = async () => {
  return await downloadAndUnzipVSCode({ version: 'stable' });
};

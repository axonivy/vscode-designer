import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const VSCODE_VERSION = '1.140.0';

export const runDownloadAndUnzipVSCode = async () => {
  return await downloadAndUnzipVSCode({ version: VSCODE_VERSION });
};

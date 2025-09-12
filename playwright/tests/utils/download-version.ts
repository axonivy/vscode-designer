import type { DownloadVersion } from '@vscode/test-electron/out/download';

export const downloadVersion: DownloadVersion = process.env.RUN_STABLE_VERSION === 'true' ? 'stable' : 'insiders';

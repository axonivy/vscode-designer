import type { LogOutputChannel } from 'vscode';
import { window } from 'vscode';

export const extensionLogOutputChannel: LogOutputChannel = window.createOutputChannel('Axon Ivy Extension', { log: true });

export const showExtensionLog = () => {
  extensionLogOutputChannel.show();
};

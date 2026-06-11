import { window } from 'vscode';

export const engineOutputChannel = window.createOutputChannel('Axon Ivy Engine');

export const showEngineLog = () => {
  engineOutputChannel.show();
};

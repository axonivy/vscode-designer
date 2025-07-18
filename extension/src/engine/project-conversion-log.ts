import { IncomingMessage } from 'http';
import * as vscode from 'vscode';

type LogEntry = { severity: string; message: string };

export const handleProjectConversionLog = (message: IncomingMessage) => {
  const output = vscode.window.createOutputChannel('Axon Ivy Project Conversion', { log: true });
  output.show();
  return new Promise<void>(resolve => {
    message.on('data', chunk => {
      try {
        const logEntry = JSON.parse(chunk);
        if (isLogEntry(logEntry)) {
          append(logEntry, output);
        }
      } catch {
        output.info(chunk.toString());
      }
    });
    message.on('end', () => {
      resolve();
    });
  });
};

const append = (entry: LogEntry, output: vscode.LogOutputChannel) => {
  const severity = entry.severity.toUpperCase();
  switch (severity) {
    case 'ERROR':
      output.error(entry.message);
      break;
    case 'WARNING':
      output.warn(entry.message);
      break;
    case 'INFO':
      output.info(entry.message);
      break;
    default:
      output.info(entry.message);
  }
};

const isLogEntry = (obj: unknown): obj is LogEntry => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'severity' in obj &&
    typeof obj.severity === 'string' &&
    'message' in obj &&
    typeof obj.message === 'string'
  );
};

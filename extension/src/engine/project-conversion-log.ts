import { IncomingMessage } from 'http';
import type { LogOutputChannel } from 'vscode';
import { window } from 'vscode';

type LogEntry = { severity: string; message: string };
const projectConversionOutputChannel: LogOutputChannel = window.createOutputChannel('Axon Ivy Project Conversion', { log: true });

export const showProjectConversionLog = () => {
  projectConversionOutputChannel.show();
};

export const handleProjectConversionLog = (message: IncomingMessage) => {
  projectConversionOutputChannel.show();
  let hasErrorLogEntry = false;
  return new Promise<{ hasErrorLogEntry: boolean }>(resolve => {
    message.on('data', chunk => {
      try {
        const logEntry = JSON.parse(chunk);
        if (isLogEntry(logEntry)) {
          hasErrorLogEntry = hasErrorLogEntry || logEntry.severity.toUpperCase() === 'ERROR';
          append(logEntry, projectConversionOutputChannel);
        }
      } catch {
        projectConversionOutputChannel.info(chunk.toString());
      }
    });
    message.on('end', () => {
      resolve({ hasErrorLogEntry });
    });
  });
};

const append = (entry: LogEntry, output: LogOutputChannel) => {
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

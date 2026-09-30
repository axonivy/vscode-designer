import type { LogOutputChannel } from 'vscode';
import { window } from 'vscode';

type LogEntry = { severity: string; message: string };
const projectConversionOutputChannel: LogOutputChannel = window.createOutputChannel('Axon Ivy Project Conversion', { log: true });

export const showProjectConversionLog = () => {
  projectConversionOutputChannel.show();
};

export const handleProjectConversionLog = async (message: ReadableStream<Uint8Array>) => {
  projectConversionOutputChannel.show();
  let hasErrorLogEntry = false;
  const log = (text: string) => {
    let entry: unknown;
    try {
      entry = JSON.parse(text);
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      projectConversionOutputChannel.info(text);
      return;
    }
    if (isLogEntry(entry)) {
      hasErrorLogEntry ||= entry.severity.toUpperCase() === 'ERROR';
      append(entry, projectConversionOutputChannel);
    } else {
      projectConversionOutputChannel.info(text);
    }
  };

  // HTTP chunks can split a JSON record or contain several concatenated records.
  let pending = '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  const consume = (text: string) => {
    for (const character of text) {
      if (!pending && /\s/.test(character)) {
        continue;
      }
      pending += character;
      if (pending.startsWith('{')) {
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (character === '\\') {
            escaped = true;
          } else if (character === '"') {
            inString = false;
          }
        } else if (character === '"') {
          inString = true;
        } else if (character === '{') {
          depth++;
        } else if (character === '}') {
          depth--;
        }
        if (depth !== 0) {
          continue;
        }
      } else if (character !== '\n') {
        continue;
      }
      log(pending.trimEnd());
      pending = '';
    }
  };

  const reader = message.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      consume(decoder.decode(value, { stream: true }));
    }
    consume(decoder.decode());
    if (pending) {
      log(pending);
    }
    return { hasErrorLogEntry };
  } finally {
    reader.releaseLock();
  }
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

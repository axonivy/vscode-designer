import { beforeEach, expect, test, vi } from 'vitest';

const { output } = vi.hoisted(() => ({
  output: { show: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
vi.mock('vscode', () => ({ window: { createOutputChannel: () => output } }));

import { handleProjectConversionLog } from './project-conversion-log';

beforeEach(() => vi.clearAllMocks());

const stream = (chunks: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(chunk));
      controller.close();
    }
  });
const encoder = new TextEncoder();

test('routes log severities and reports conversion errors', async () => {
  const entries = [
    { severity: 'INFO', message: 'Starting' },
    { severity: 'WARNING', message: 'Warning' },
    { severity: 'error', message: 'Failed' },
    { severity: 'OTHER', message: 'Other message' }
  ];
  await expect(handleProjectConversionLog(stream(entries.map(entry => encoder.encode(JSON.stringify(entry)))))).resolves.toEqual({
    hasErrorLogEntry: true
  });
  expect(output.show).toHaveBeenCalledOnce();
  expect(output.info).toHaveBeenCalledWith('Starting');
  expect(output.info).toHaveBeenCalledWith('Other message');
  expect(output.warn).toHaveBeenCalledWith('Warning');
  expect(output.error).toHaveBeenCalledWith('Failed');
});

test('handles split UTF-8, escaped braces and multiple JSON records per chunk', async () => {
  const message = 'Conversion \u00e4 with } and "quotes" and \\slashes';
  const data = encoder.encode(
    JSON.stringify({ severity: 'INFO', message }) + JSON.stringify({ severity: 'ERROR', message: 'Failed' }) + '\n'
  );
  const body = stream(Array.from(data, byte => Uint8Array.of(byte)));
  await expect(handleProjectConversionLog(body)).resolves.toEqual({ hasErrorLogEntry: true });
  expect(output.info).toHaveBeenCalledExactlyOnceWith(message);
  expect(output.error).toHaveBeenCalledExactlyOnceWith('Failed');

  vi.clearAllMocks();
  await handleProjectConversionLog(stream([data]));
  expect(output.info).toHaveBeenCalledExactlyOnceWith(message);
  expect(output.error).toHaveBeenCalledExactlyOnceWith('Failed');
});

test('preserves plain text, malformed JSON and unrecognized records', async () => {
  const data = 'Plain text\n{invalid}\n{"other":"value"}\nTrailing text';
  await expect(handleProjectConversionLog(stream([encoder.encode(data)]))).resolves.toEqual({ hasErrorLogEntry: false });
  expect(output.info.mock.calls).toEqual([['Plain text'], ['{invalid}'], ['{"other":"value"}'], ['Trailing text']]);
});

test('empty streams complete successfully', async () => {
  await expect(handleProjectConversionLog(stream([]))).resolves.toEqual({ hasErrorLogEntry: false });
});

test('stream failures reject instead of reporting a successful conversion', async () => {
  const error = new Error('Connection lost');
  const body = new ReadableStream<Uint8Array>({ start: controller => controller.error(error) });
  await expect(handleProjectConversionLog(body)).rejects.toThrow(error);
  expect(body.locked).toBe(false);
});

test('emits complete records before the stream ends', async () => {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const body = new ReadableStream<Uint8Array>({
    start: value => {
      controller = value;
    }
  });
  const result = handleProjectConversionLog(body);
  controller?.enqueue(encoder.encode('{"severity":"INFO","message":"Starting"}'));
  await vi.waitFor(() => expect(output.info).toHaveBeenCalledWith('Starting'));
  controller?.close();
  await expect(result).resolves.toEqual({ hasErrorLogEntry: false });
});

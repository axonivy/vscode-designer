import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { token, report, dispose, wait, debug, withProgress } = vi.hoisted(() => {
  const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
  const report = vi.fn();
  const dispose = vi.fn();
  return {
    token,
    report,
    dispose,
    wait: vi.fn(),
    debug: vi.fn(),
    withProgress: vi.fn(
      async (_options: unknown, task: (progress: { report: typeof report }, cancellationToken: typeof token) => Promise<void>) =>
        task({ report }, token)
    )
  };
});
vi.mock('vscode', () => ({ ProgressLocation: { Notification: 15 }, window: { withProgress } }));
vi.mock('node:timers/promises', () => ({ setTimeout: wait }));
vi.mock('../../base/extension-output-channel', () => ({ extensionLogOutputChannel: { debug } }));

import { pollWithProgress } from './poll';

const fetchMock = vi.fn<typeof fetch>();
const url = 'http://localhost:8080/';
let cancel: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  token.isCancellationRequested = false;
  token.onCancellationRequested.mockImplementation((listener: () => void) => {
    cancel = () => {
      token.isCancellationRequested = true;
      listener();
    };
    return { dispose };
  });
  wait.mockResolvedValue(undefined);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test('returns only when the engine responds with HTTP 200', async () => {
  const body = new ReadableStream<Uint8Array>();
  const cancelBody = vi.spyOn(body, 'cancel');
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response(body));
  await pollWithProgress(url, 'Waiting');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledWith(2000, undefined, { signal: expect.any(AbortSignal) });
  expect(cancelBody).toHaveBeenCalledOnce();
  expect(report).toHaveBeenCalledWith({ message: url });
  expect(dispose).toHaveBeenCalledOnce();
});

test('retries HTTP errors and network errors during engine startup', async () => {
  const error = new TypeError('fetch failed');
  fetchMock
    .mockRejectedValueOnce(error)
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response());
  await pollWithProgress(url, 'Waiting');
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(wait).toHaveBeenCalledTimes(2);
  expect(debug).toHaveBeenCalledWith(`Engine readiness probe failed: ${url}`, error);
});

test('cancellation aborts an in-flight request', async () => {
  fetchMock.mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      })
  );
  const result = pollWithProgress(url, 'Waiting');
  const assertion = expect(result).rejects.toBe('Polling of "Waiting" was cancelled.');
  cancel();
  await assertion;
  expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(wait).not.toHaveBeenCalled();
  expect(dispose).toHaveBeenCalledOnce();
});

test('cancellation aborts the delay between probes', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
  wait.mockImplementationOnce(
    (_ms: number, _value: undefined, options: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      })
  );
  const result = pollWithProgress(url, 'Waiting');
  const assertion = expect(result).rejects.toBe('Polling of "Waiting" was cancelled.');
  await vi.waitFor(() => expect(wait).toHaveBeenCalledOnce());
  cancel();
  await assertion;
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(dispose).toHaveBeenCalledOnce();
});

test('an already cancelled operation makes no requests', async () => {
  token.isCancellationRequested = true;
  await expect(pollWithProgress(url, 'Waiting')).rejects.toBe('Polling of "Waiting" was cancelled.');
  expect(fetchMock).not.toHaveBeenCalled();
  expect(dispose).toHaveBeenCalledOnce();
});

test('unexpected delay failures are not swallowed', async () => {
  const error = new Error('Timer failed');
  fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
  wait.mockRejectedValueOnce(error);
  await expect(pollWithProgress(url, 'Waiting')).rejects.toThrow(error);
  expect(dispose).toHaveBeenCalledOnce();
});

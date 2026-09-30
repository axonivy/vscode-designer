import AdmZip from 'adm-zip';
import { randomBytes } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { downloadEngine } from './download';

const url = 'https://example.com/engine.zip';
let rootDir: string;
const logger = vi.fn();

beforeEach(() => {
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-download-test-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  logger.mockReset();
  fs.rmSync(rootDir, { recursive: true, force: true });
});

const mockResponse = (body: BodyInit | Buffer | null, init?: ResponseInit) => {
  const response = new Response(Buffer.isBuffer(body) ? Uint8Array.from(body) : body, init);
  Object.defineProperty(response, 'url', { value: url });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  return response;
};

const archive = (contents: Buffer = Buffer.from('engine contents')) => {
  const zip = new AdmZip();
  zip.addFile('bin/engine', contents);
  return zip.toBuffer();
};

test('downloads and extracts an engine, logging completion and removing the archive', async () => {
  const zip = archive();
  mockResponse(zip, { headers: { 'content-length': String(zip.length) } });

  await expect(downloadEngine(url, rootDir, logger)).resolves.toBe(path.join(rootDir, 'engine'));

  expect(fs.readFileSync(path.join(rootDir, 'engine/bin/engine'), 'utf8')).toBe('engine contents');
  expect(fs.readdirSync(rootDir)).toEqual(['engine']);
  expect(logger).toHaveBeenCalledWith(expect.stringContaining('Download engine from'));
  expect(logger).toHaveBeenCalledWith('--> Download finished - 0.00 MB downloaded');
  expect(logger).toHaveBeenCalledWith(expect.stringContaining("Extract '"));
  expect(logger).toHaveBeenLastCalledWith('--> Extract finished');
});

test.each([
  [{ 'content-length': '1024' }, '0.00 MB'],
  [{}, 'unknown size']
])('logs download progress with headers %j', async (headers, size) => {
  const response = mockResponse(archive(), { headers });
  vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(1500);

  await downloadEngine(url, rootDir, logger);

  expect(logger).toHaveBeenCalledWith(`Downloaded: 0.00 MB of ${size}`);
  expect(response.body?.locked).toBe(false);
});

test('honors write backpressure and closes the archive before extracting into a custom directory', async () => {
  const contents = randomBytes(512 * 1024);
  const zip = archive(contents);
  let offset = 0;
  mockResponse(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === zip.length) {
          controller.close();
          return;
        }
        const end = Math.min(offset + 4096, zip.length);
        controller.enqueue(zip.subarray(offset, end));
        offset = end;
      }
    })
  );
  const createWriteStream = fs.createWriteStream;
  let fileStream: fs.WriteStream | undefined;
  let offsetAtFirstWrite: number | undefined;
  vi.spyOn(fs, 'createWriteStream').mockImplementation(file => {
    fileStream = createWriteStream(file, { highWaterMark: 1 });
    const write = fileStream._write.bind(fileStream);
    vi.spyOn(fileStream, '_write').mockImplementation((chunk, encoding, callback) => {
      setImmediate(() => {
        offsetAtFirstWrite ??= offset;
        write(chunk, encoding, callback);
      });
    });
    return fileStream;
  });
  logger.mockImplementation(message => {
    if (message.startsWith("Extract '")) {
      expect(fileStream?.closed).toBe(true);
    }
  });

  await expect(downloadEngine(url, rootDir, logger, 'custom/engine')).resolves.toBe(path.join(rootDir, 'custom/engine'));

  expect(offsetAtFirstWrite).toBeLessThan(zip.length / 2);
  expect(fs.readFileSync(path.join(rootDir, 'custom/engine/bin/engine'))).toEqual(contents);
  expect(fs.readdirSync(rootDir)).toEqual(['custom']);
});

test('rejects fetch failures without creating download files', async () => {
  const error = new Error('Fetch failed');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));

  await expect(downloadEngine(url, rootDir, logger)).rejects.toBe(error);
  expect(fs.readdirSync(rootDir)).toEqual([]);
});

test('rejects unsuccessful HTTP responses and cancels their bodies', async () => {
  const cancel = vi.fn();
  mockResponse(new ReadableStream({ cancel }), { status: 503 });

  await expect(downloadEngine(url, rootDir, logger)).rejects.toThrow('Download engine failed with status code 503');
  expect(cancel).toHaveBeenCalledOnce();
  expect(fs.readdirSync(rootDir)).toEqual([]);
});

test('rejects missing response bodies without opening a file', async () => {
  mockResponse(null);
  const createWriteStream = vi.spyOn(fs, 'createWriteStream');

  await expect(downloadEngine(url, rootDir, logger)).rejects.toThrow('Failed to get reader from response body');
  expect(createWriteStream).not.toHaveBeenCalled();
  expect(fs.readdirSync(rootDir)).toEqual([]);
});

test('cancels the response body when download directory creation fails', async () => {
  const cancel = vi.fn();
  const response = mockResponse(new ReadableStream({ cancel }));
  const invalidRoot = path.join(rootDir, 'file');
  fs.writeFileSync(invalidRoot, 'existing file');

  await expect(downloadEngine(url, invalidRoot, logger)).rejects.toMatchObject({ code: 'EEXIST' });

  expect(cancel).toHaveBeenCalledOnce();
  expect(response.body?.locked).toBe(false);
  expect(fs.readFileSync(invalidRoot, 'utf8')).toBe('existing file');
});

test('rejects body read failures and removes incomplete downloads', async () => {
  const error = new Error('Read failed');
  let reads = 0;
  const response = mockResponse(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (reads++ === 0) {
          controller.enqueue(Buffer.from('partial archive'));
        } else {
          controller.error(error);
        }
      }
    })
  );

  await expect(downloadEngine(url, rootDir, logger)).rejects.toBe(error);
  expect(response.body?.locked).toBe(false);
  expect(fs.readdirSync(rootDir)).toEqual([]);
  expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('--> Download finished'));
});

test('rejects file open failures and cancels a pending response body', async () => {
  const cancel = vi.fn();
  const response = mockResponse(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Buffer.from('partial archive'));
      },
      cancel
    })
  );
  const createWriteStream = fs.createWriteStream;
  vi.spyOn(fs, 'createWriteStream').mockImplementation(file => createWriteStream(path.join(String(file), 'missing')));

  await expect(downloadEngine(url, rootDir, logger)).rejects.toMatchObject({ code: 'ENOENT' });
  expect(cancel).toHaveBeenCalledOnce();
  expect(response.body?.locked).toBe(false);
  expect(fs.readdirSync(rootDir)).toEqual([]);
});

test('awaits body cancellation when opening the file throws synchronously', async () => {
  const error = new Error('Cannot open file');
  let canceled = false;
  const response = mockResponse(
    new ReadableStream<Uint8Array>({
      async cancel() {
        await new Promise<void>(resolve => setImmediate(resolve));
        canceled = true;
      }
    })
  );
  vi.spyOn(fs, 'createWriteStream').mockImplementation(() => {
    throw error;
  });

  await expect(downloadEngine(url, rootDir, logger)).rejects.toBe(error);
  expect(canceled).toBe(true);
  expect(response.body?.locked).toBe(false);
  expect(fs.readdirSync(rootDir)).toEqual([]);
});

test('rejects file write failures, closes the file and cancels a pending response body', async () => {
  const error = new Error('Disk full');
  const cancel = vi.fn();
  const response = mockResponse(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Buffer.from('partial archive'));
      },
      cancel
    })
  );
  const createWriteStream = fs.createWriteStream;
  let fileStream: fs.WriteStream | undefined;
  vi.spyOn(fs, 'createWriteStream').mockImplementation(file => {
    fileStream = createWriteStream(file);
    vi.spyOn(fileStream, '_write').mockImplementation((_chunk, _encoding, callback) => callback(error));
    return fileStream;
  });

  await expect(downloadEngine(url, rootDir, logger)).rejects.toBe(error);
  expect(fileStream?.closed).toBe(true);
  expect(cancel).toHaveBeenCalledOnce();
  expect(response.body?.locked).toBe(false);
  expect(fs.readdirSync(rootDir)).toEqual([]);
  expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('--> Download finished'));
});

test('rejects invalid ZIP extraction instead of leaving the download pending', async () => {
  mockResponse(Buffer.from('not a ZIP file'));
  fs.writeFileSync(path.join(rootDir, 'engine.zip'), 'existing archive');
  fs.mkdirSync(path.join(rootDir, 'engine'));
  fs.writeFileSync(path.join(rootDir, 'engine/existing'), 'existing engine');

  await expect(downloadEngine(url, rootDir, logger)).rejects.toThrow();

  expect(fs.readdirSync(rootDir).sort()).toEqual(['engine', 'engine.zip']);
  expect(fs.readFileSync(path.join(rootDir, 'engine.zip'), 'utf8')).toBe('existing archive');
  expect(fs.readFileSync(path.join(rootDir, 'engine/existing'), 'utf8')).toBe('existing engine');
  expect(logger).not.toHaveBeenCalledWith('--> Extract finished');
});

test('rejects extraction write failures and removes the downloaded archive', async () => {
  mockResponse(archive());
  fs.writeFileSync(path.join(rootDir, 'engine'), 'existing file');

  await expect(downloadEngine(url, rootDir, logger)).rejects.toThrow();

  expect(fs.readdirSync(rootDir)).toEqual(['engine']);
  expect(fs.readFileSync(path.join(rootDir, 'engine'), 'utf8')).toBe('existing file');
  expect(logger).not.toHaveBeenCalledWith('--> Extract finished');
});

test('reports both the download failure and a temporary-file cleanup failure', async () => {
  mockResponse(Buffer.from('not a ZIP file'));
  const cleanupError = new Error('Cleanup failed');
  vi.spyOn(fs, 'rmSync').mockImplementation(() => {
    throw cleanupError;
  });

  const result = downloadEngine(url, rootDir, logger);
  await expect(result).rejects.toBeInstanceOf(AggregateError);
  await expect(result).rejects.toMatchObject({
    message: 'Engine download failed and its resources could not be cleaned up',
    cause: cleanupError,
    errors: [expect.any(Error), cleanupError]
  });
});

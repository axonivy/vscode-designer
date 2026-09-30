import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { EngineRequestError, engineFetch } from './engine-fetch';
import { convertProject, createWorkspace, getComponentFormUrl, importProcess, projects, stopBpmEngine } from './generated/client';

const fetchMock = vi.fn<typeof fetch>();
const baseURL = 'http://localhost:8080/context/designer/api/';
type FetchResponse = { data: unknown; status: number; headers: Headers };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test('generated JSON requests preserve the engine context path and headers', async () => {
  fetchMock.mockResolvedValue(new Response('{"id":"workspace"}', { headers: { 'Content-Type': 'application/json', 'X-Test': 'value' } }));
  const response = await createWorkspace(
    { name: 'My workspace', path: '/workspace' },
    { baseURL, headers: { 'X-Requested-By': 'web-ide' } }
  );
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/context/designer/api/web-ide/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-By': 'web-ide' },
    body: '{"name":"My workspace","path":"/workspace"}'
  });
  expect(response.data).toEqual({ id: 'workspace' });
  expect(response.status).toBe(200);
  expect(response.headers.get('X-Test')).toBe('value');
});

test('generated query parameters encode paths and preserve false values', async () => {
  fetchMock.mockResolvedValue(new Response('[]'));
  await projects({ workspaceId: 'space & id', withDependencies: false }, { baseURL });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/context/designer/api/web-ide/projects?workspaceId=space+%26+id&withDependencies=false',
    { method: 'GET' }
  );
  expect(getComponentFormUrl({ componentId: 'a/b & c', project: 'project' })).toBe('/web-ide/form?componentId=a%2Fb+%26+c&project=project');
});

test('generated multipart uploads leave the boundary to fetch', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  const file = new File(['<process/>'], 'process.bpmn', { type: 'application/xml' });
  await importProcess({ workspaceId: 'workspace', projectDir: '/project', file }, { baseURL, headers: { 'X-Requested-By': 'web-ide' } });
  const options = fetchMock.mock.calls[0]?.[1];
  expect(options?.headers).toEqual({ 'X-Requested-By': 'web-ide' });
  expect(options?.body).toBeInstanceOf(FormData);
  if (!(options?.body instanceof FormData)) {
    throw new Error('Expected multipart form data');
  }
  expect(options.body.get('file')).toEqual(file);
  expect(options.body.get('workspaceId')).toBe('workspace');
  expect(options.body.get('projectDir')).toBe('/project');
});

test('empty successful responses do not cause JSON parsing errors', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  await expect(stopBpmEngine({ workspaceId: 'workspace' }, { baseURL })).resolves.toMatchObject({ data: undefined, status: 204 });
});

test.each([
  ['42', 42],
  ['plain text', 'plain text'],
  ['{"name":"project"}', { name: 'project' }]
])('decodes response body %s', async (body, data) => {
  fetchMock.mockResolvedValue(new Response(body));
  await expect(engineFetch<FetchResponse>('/version', { baseURL })).resolves.toMatchObject({ data });
});

test.each([400, 404, 500])('rejects HTTP %s with structured response details', async status => {
  fetchMock.mockResolvedValue(new Response('{"errorMessage":"Request rejected"}', { status, statusText: 'Failed' }));
  await expect(engineFetch('/project', { baseURL, method: 'POST' })).rejects.toMatchObject({
    method: 'POST',
    url: 'http://localhost:8080/context/designer/api/project',
    response: { status, statusText: 'Failed', data: { errorMessage: 'Request rejected' } }
  });
});

test('rejects text error responses even when streaming was requested', async () => {
  fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));
  await expect(convertProject({}, { baseURL, responseType: 'stream' })).rejects.toMatchObject({
    response: { status: 502, data: 'Bad gateway' }
  });
});

test('preserves causes and request details for network errors', async () => {
  const cause = new TypeError('fetch failed');
  fetchMock.mockRejectedValue(cause);
  await expect(engineFetch('/version', { baseURL })).rejects.toMatchObject({
    name: 'EngineRequestError',
    method: 'GET',
    url: 'http://localhost:8080/context/designer/api/version',
    cause
  });
});

test('preserves diagnostics when reading the response body fails', async () => {
  const cause = new Error('connection closed');
  fetchMock.mockResolvedValue(new Response(new ReadableStream({ start: controller => controller.error(cause) })));
  await expect(engineFetch('/version', { baseURL })).rejects.toBeInstanceOf(EngineRequestError);
});

test('forwards abort signals and wraps aborted requests', async () => {
  const controller = new AbortController();
  controller.abort();
  fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
  await expect(engineFetch('/version', { baseURL, signal: controller.signal })).rejects.toMatchObject({
    cause: { name: 'AbortError' }
  });
  expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal });
});

test('returns conversion streams before the response is finished', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"severity":"INFO","message":"Converting"}'));
    }
  });
  fetchMock.mockResolvedValue(new Response(body));
  const response = await convertProject({ workspaceId: 'workspace', projectDir: '/project' }, { baseURL, responseType: 'stream' });
  expect(response.data).toBe(body);
  expect(body.locked).toBe(false);
  await body.cancel();
});

test('does not prepend the base URL to absolute URLs', async () => {
  fetchMock.mockResolvedValue(new Response('42'));
  await engineFetch('http://localhost:9090/version', { baseURL });
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:9090/version', {});
});

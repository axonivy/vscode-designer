import { createServer } from 'node:http';
import { expect, test } from 'vitest';
import { convertProject, createWorkspace, importProjects, projects } from './generated/client';

test('generated clients work with native fetch over HTTP, including multipart uploads and streaming', async () => {
  const requests: Array<{
    url: string | undefined;
    contentType: string | undefined;
    requestedBy: string | string[] | undefined;
    body: string;
  }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    requests.push({
      url: request.url,
      contentType: request.headers['content-type'],
      requestedBy: request.headers['x-requested-by'],
      body: Buffer.concat(chunks).toString()
    });
    if (request.url?.includes('/project/convert')) {
      response.write('{"severity":"INFO","message":"Converting"}');
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    response.end(request.url?.includes('/projects?') ? '[]' : '{"id":"workspace"}');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected HTTP server address');
    }
    const options = { baseURL: `http://127.0.0.1:${address.port}/context/designer/api`, headers: { 'X-Requested-By': 'web-ide' } };
    const workspace = await createWorkspace({ name: 'workspace', path: '/workspace' }, options);
    expect(workspace.data.id).toBe('workspace');
    await projects({ workspaceId: 'workspace', withDependencies: false }, options);
    await importProjects('workspace', { file: new File(['archive'], 'project.iar'), targetPath: '/projects' }, options);
    expect(requests[0]).toMatchObject({
      url: '/context/designer/api/web-ide/workspace',
      contentType: 'application/json',
      requestedBy: 'web-ide',
      body: '{"name":"workspace","path":"/workspace"}'
    });
    expect(requests[1]?.url).toBe('/context/designer/api/web-ide/projects?workspaceId=workspace&withDependencies=false');
    expect(requests[2]?.contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(requests[2]?.body).toContain('filename="project.iar"');
    expect(requests[2]?.body).toContain('archive');
    expect(requests[2]?.body).toContain('/projects');

    const conversion = await convertProject({ workspaceId: 'workspace' }, { ...options, responseType: 'stream' });
    expect(conversion.data).toBeInstanceOf(ReadableStream);
    if (!(conversion.data instanceof ReadableStream)) {
      throw new Error('Expected conversion stream');
    }
    const reader = conversion.data.getReader();
    try {
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toBe('{"severity":"INFO","message":"Converting"}');
      await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
});

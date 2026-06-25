import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServer } from 'node:http';
import { afterEach, expect, test, vi } from 'vitest';

const { mockOutputChannel, mockLm, mockCreateNewProject, mockCreateNewDataClass, mockCreateNewProcess, mockCreateNewDialog } = vi.hoisted(
  () => ({
    mockOutputChannel: { appendLine: vi.fn() },
    mockLm: {
      tools: [] as Array<{ name: string; description?: string; inputSchema?: unknown }>,
      invokeTool: vi.fn()
    },
    mockCreateNewProject: vi.fn().mockResolvedValue('Project created successfully'),
    mockCreateNewDataClass: vi.fn().mockResolvedValue("Data Class created successfully at '/tmp/ivy/src_hd/my/pkg/Demo.ivyClass'"),
    mockCreateNewProcess: vi.fn().mockResolvedValue("Business Process created successfully at '/tmp/ivy/processes/MyProcess.p.json'"),
    mockCreateNewDialog: vi.fn().mockResolvedValue("Form Dialog created successfully at '/tmp/ivy/dialogs/MyDialog.xhtml'")
  })
);

vi.mock('./new-project', () => ({
  createNewProject: mockCreateNewProject
}));

vi.mock('./new-data-class', () => ({
  createNewDataClass: mockCreateNewDataClass
}));

vi.mock('./new-process', () => ({
  createNewProcess: mockCreateNewProcess
}));

vi.mock('./new-dialog', () => ({
  createNewDialog: mockCreateNewDialog
}));

vi.mock('vscode', () => ({
  lm: mockLm,
  LanguageModelTextPart: class {
    constructor(public value: string) {}
  },
  window: {
    createOutputChannel: vi.fn(() => mockOutputChannel)
  }
}));

import { LocalMcpServer } from './local-mcp';

let rpcServer: LocalMcpServer | undefined;

afterEach(async () => {
  await rpcServer?.stop();
  rpcServer = undefined;
  mockLm.tools = [];
  mockLm.invokeTool.mockReset();
  mockOutputChannel.appendLine.mockReset();
  mockCreateNewProject.mockReset();
  mockCreateNewProject.mockResolvedValue('Project created successfully');
  mockCreateNewDataClass.mockReset();
  mockCreateNewDataClass.mockResolvedValue("Data Class created successfully at '/tmp/ivy/src_hd/my/pkg/Demo.ivyClass'");
  mockCreateNewProcess.mockReset();
  mockCreateNewProcess.mockResolvedValue("Business Process created successfully at '/tmp/ivy/processes/MyProcess.p.json'");
  mockCreateNewDialog.mockReset();
  mockCreateNewDialog.mockResolvedValue("Form Dialog created successfully at '/tmp/ivy/dialogs/MyDialog.xhtml'");
});

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function postMcp(
  baseUrl: string,
  body: unknown,
  sessionId?: string
): Promise<{ status: number; payload: unknown; sessionId?: string }> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream'
  };

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const raw = await response.text();
  const dataLine = raw.split('\n').find(line => line.startsWith('data: '));
  if (!dataLine) {
    throw new Error(`No MCP payload in response: ${raw}`);
  }

  return {
    status: response.status,
    payload: JSON.parse(dataLine.slice('data: '.length)),
    sessionId: response.headers.get('mcp-session-id') ?? undefined
  };
}

async function setupRpcServer(options?: { exposeAllTools?: boolean }): Promise<{ baseUrl: string }> {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  rpcServer = new LocalMcpServer();
  await rpcServer.start({ enabled: true, host: '127.0.0.1', port, exposeAllTools: options?.exposeAllTools });

  return { baseUrl };
}

async function initializeMcpSession(baseUrl: string, id = 'init-1'): Promise<string> {
  const initialize = await postMcp(baseUrl, {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'local-mcp-test', version: '0.0.1' }
    }
  });

  expect(initialize.status).toBe(200);
  expect(initialize.sessionId).toBeDefined();
  return initialize.sessionId as string;
}

test('exposes health endpoint and returns lm tools via MCP tools/list', async () => {
  mockLm.tools = [
    {
      name: 'new_axon_ivy_project',
      description: 'Create a new Axon Ivy project',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      }
    },
    {
      name: 'tool_without_schema',
      description: 'No schema provided'
    },
    {
      name: 'tool_with_empty_object_schema',
      description: 'Empty object schema from host',
      inputSchema: {}
    },
    {
      name: 'tool_with_invalid_schema',
      description: 'Invalid schema from host',
      inputSchema: true
    },
    {
      name: 'external_tool',
      description: 'Should not be exposed by local MCP',
      inputSchema: { type: 'object', properties: {} }
    }
  ];

  const { baseUrl } = await setupRpcServer();

  const healthResponse = await fetch(`${baseUrl}/health`);
  expect(healthResponse.status).toBe(200);
  await expect(healthResponse.json()).resolves.toEqual({ ok: true, status: 'up' });

  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  const client = new Client({ name: 'local-rpc-test', version: '0.0.1' });
  try {
    await client.connect(transport);
    const listTools = await client.listTools();

    expect(listTools.tools).toEqual([
      {
        name: 'new_axon_ivy_project',
        description: 'Create a new Axon Ivy project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        }
      }
    ]);
  } finally {
    await client.close();
  }
});

test('supports repeated client initialize/list cycles', async () => {
  mockLm.tools = [
    {
      name: 'new_axon_ivy_project',
      description: 'Create a new Axon Ivy project',
      inputSchema: { type: 'object', properties: {} }
    }
  ];

  const { baseUrl } = await setupRpcServer();

  const transport1 = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  const client1 = new Client({ name: 'local-rpc-test-1', version: '0.0.1' });
  await client1.connect(transport1);
  const firstList = await client1.listTools();
  expect(firstList.tools.map(tool => tool.name)).toEqual(['new_axon_ivy_project']);
  await client1.close();

  const transport2 = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  const client2 = new Client({ name: 'local-rpc-test-2', version: '0.0.1' });
  await client2.connect(transport2);
  const secondList = await client2.listTools();
  expect(secondList.tools.map(tool => tool.name)).toEqual(['new_axon_ivy_project']);
  await client2.close();
});

test('exposes all IDE tools when exposeAllTools is enabled', async () => {
  mockLm.tools = [
    {
      name: 'new_axon_ivy_project',
      description: 'Create a new Axon Ivy project',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'external_tool',
      description: 'Contributed by another extension',
      inputSchema: { type: 'object', properties: {} }
    }
  ];

  const { baseUrl } = await setupRpcServer({ exposeAllTools: true });

  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  const client = new Client({ name: 'local-rpc-test-all-tools', version: '0.0.1' });

  try {
    await client.connect(transport);
    const listTools = await client.listTools();
    expect(listTools.tools.map(tool => tool.name)).toEqual(['new_axon_ivy_project', 'external_tool']);
  } finally {
    await client.close();
  }
});

test('executes own tools headlessly in MCP mode', async () => {
  mockLm.tools = [
    {
      name: 'new_axon_ivy_project',
      description: 'Create a new Axon Ivy project',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          path: { type: 'string' },
          groupId: { type: 'string' },
          projectId: { type: 'string' }
        }
      }
    }
  ];

  const { baseUrl } = await setupRpcServer();
  const sessionId = await initializeMcpSession(baseUrl, 'init-1');

  const call = await postMcp(
    baseUrl,
    {
      jsonrpc: '2.0',
      id: 'call-1',
      method: 'tools/call',
      params: {
        name: 'new_axon_ivy_project',
        arguments: {
          name: 'DemoProject',
          path: '/tmp/ivy',
          groupId: 'com.acme',
          projectId: 'com.acme.demo'
        }
      }
    },
    sessionId
  );

  expect(call.status).toBe(200);
  expect(mockCreateNewProject).toHaveBeenCalledOnce();
  expect(mockLm.invokeTool).not.toHaveBeenCalled();

  const payload = call.payload as {
    result?: { content: Array<{ type: string; text: string }> };
  };
  expect(payload.result?.content[0]).toEqual({ type: 'text', text: 'Project created successfully' });
});

test('executes additional own tools headlessly in MCP mode', async () => {
  mockLm.tools = [
    {
      name: 'new_axon_ivy_data_class',
      description: 'Create a new Axon Ivy data class',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          namespace: { type: 'string' },
          projectPath: { type: 'string' },
          type: { type: 'string' }
        }
      }
    }
  ];

  const { baseUrl } = await setupRpcServer();
  const sessionId = await initializeMcpSession(baseUrl, 'init-2');

  const call = await postMcp(
    baseUrl,
    {
      jsonrpc: '2.0',
      id: 'call-2',
      method: 'tools/call',
      params: {
        name: 'new_axon_ivy_data_class',
        arguments: {
          name: 'Demo',
          namespace: 'my.pkg',
          projectPath: '/tmp/ivy',
          type: 'Data Class'
        }
      }
    },
    sessionId
  );

  expect(call.status).toBe(200);
  expect(mockCreateNewDataClass).toHaveBeenCalledOnce();
  expect(mockLm.invokeTool).not.toHaveBeenCalled();

  const payload = call.payload as {
    result?: { content: Array<{ type: string; text: string }> };
  };
  expect(payload.result?.content[0]).toEqual({
    type: 'text',
    text: "Data Class created successfully at '/tmp/ivy/src_hd/my/pkg/Demo.ivyClass'"
  });
});

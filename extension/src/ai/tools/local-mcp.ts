import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { LanguageModelTextPart, lm } from 'vscode';
import { engineOutputChannel } from './../../engine/engine-output-channel.js';
import { isOwnToolName } from './tool-ids';

export type McpOptions = {
  enabled: boolean;
  host: string;
  port: number;
  exposeAllTools?: boolean;
};

export class LocalMcpServer {
  private server?: Server;
  private mcpServer?: McpServer;
  private mcpTransport?: StreamableHTTPServerTransport;
  private exposeAllTools = false;

  async start(options: McpOptions): Promise<void> {
    if (!options.enabled || this.server) {
      return;
    }

    this.exposeAllTools = options.exposeAllTools ?? false;

    this.mcpServer = new McpServer({ name: 'axonivy-local-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: lm.tools
        .filter(tool => this.isToolExposed(tool.name))
        .map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: this.normalizeInputSchema(tool.inputSchema)
        }))
    }));
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args = {} } = request.params;

      if (!this.isToolExposed(name)) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Tool '${name}' is not exposed by this MCP server` }]
        };
      }

      try {
        const result = isOwnToolName(name)
          ? await this.invokeOwnToolHeadless(name, args)
          : await lm.invokeTool(name, { toolInvocationToken: undefined, input: args });
        const content = this.toMcpContent(result);
        return { content };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: 'text', text: message }]
        };
      }
    });

    await this.resetMcpTransport();

    this.server = createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(options.port, options.host, () => {
        this.server?.off('error', reject);
        engineOutputChannel.appendLine(`[local-mcp] listening on http://${options.host}:${options.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.server?.close(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = undefined;
    await this.mcpServer?.close();
    this.mcpServer = undefined;
    this.mcpTransport = undefined;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if ((req.method === 'GET' || req.method === 'POST' || req.method === 'DELETE') && url.pathname === '/mcp') {
      return this.handleMcpRequest(req, res);
    }
    if (req.method === 'GET' && req.url === '/health') {
      return this.writeJson(res, 200, { ok: true, status: 'up' });
    }
    if (req.method !== 'GET') {
      return this.writeJson(res, 405, { ok: false, error: 'Method not allowed' });
    }
    return this.writeJson(res, 404, { ok: false, error: 'Not found' });
  }

  private async handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!this.mcpTransport) {
      return this.writeJson(res, 503, { ok: false, error: 'MCP transport not available' });
    }

    const parsedBody = await this.readJsonBody(req, res);
    if (req.method === 'POST' && parsedBody === undefined) {
      if (!res.headersSent) {
        this.writeJson(res, 400, { ok: false, error: 'Invalid or missing JSON body' });
      }
      return;
    }

    try {
      if (this.shouldResetSession(req, parsedBody)) {
        await this.resetMcpTransport();
      }
      await this.mcpTransport.handleRequest(req, res, parsedBody);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      engineOutputChannel.appendLine(`[local-mcp] mcp request failed: ${message}`);
      if (!res.headersSent) {
        this.writeJson(res, 500, { ok: false, error: 'Internal server error' });
      }
    }
  }

  private toMcpContent(result: { content: unknown[] }): { type: 'text'; text: string }[] {
    const content = result.content.map(part => {
      if (part instanceof LanguageModelTextPart) {
        return { type: 'text' as const, text: part.value };
      }
      if (part && typeof part === 'object' && 'value' in part) {
        return { type: 'text' as const, text: JSON.stringify((part as { value: unknown }).value) };
      }
      return { type: 'text' as const, text: JSON.stringify(part) };
    });
    if (content.length === 0) {
      content.push({ type: 'text', text: '' });
    }
    return content;
  }

  private normalizeInputSchema(inputSchema: unknown): Record<string, unknown> {
    if (inputSchema && typeof inputSchema === 'object' && !Array.isArray(inputSchema)) {
      const schema = inputSchema as Record<string, unknown>;
      const properties =
        schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
          ? (schema.properties as Record<string, unknown>)
          : {};

      return {
        ...schema,
        type: 'object',
        properties
      };
    }
    return { type: 'object', properties: {} };
  }

  private async invokeOwnToolHeadless(name: string, args: unknown): Promise<{ content: unknown[] }> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new Error(`Tool '${name}' expects arguments as an object`);
    }

    switch (name) {
      case 'new_axon_ivy_project': {
        // Avoid lm.invokeTool for own tools in MCP mode to prevent interactive confirmation popups.
        const { createNewProject } = await import('./new-project');
        const message = await createNewProject(args as Awaited<Parameters<typeof createNewProject>[0]>);
        return { content: [new LanguageModelTextPart(message)] };
      }
      default:
        throw new Error(`No headless MCP handler registered for tool '${name}'`);
    }
  }

  private isToolExposed(name: string): boolean {
    return this.exposeAllTools || isOwnToolName(name);
  }

  private async resetMcpTransport(): Promise<void> {
    await this.mcpServer?.close();
    // Stateful session mode for Streamable HTTP. We rotate sessions when a fresh initialize arrives.
    this.mcpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
    await this.mcpServer?.connect(this.mcpTransport);
  }

  private shouldResetSession(req: IncomingMessage, parsedBody: unknown): boolean {
    if (req.method !== 'POST') {
      return false;
    }
    if (req.headers['mcp-session-id']) {
      return false;
    }

    const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
    return messages.some(message => this.isInitializeRequest(message));
  }

  private isInitializeRequest(message: unknown): boolean {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return false;
    }
    return (message as { method?: unknown }).method === 'initialize';
  }

  private async readJsonBody(req: IncomingMessage, res: ServerResponse): Promise<unknown | undefined> {
    if (req.method !== 'POST') {
      return undefined;
    }

    const contentType = req.headers['content-type'];
    if (typeof contentType !== 'string' || !contentType.includes('application/json')) {
      return undefined;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString('utf8');
    if (rawBody.trim().length === 0) {
      return undefined;
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      this.writeJson(res, 400, { ok: false, error: 'Parse error: Invalid JSON' });
      return undefined;
    }
  }

  private writeJson(res: ServerResponse, status: number, payload: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  }
}

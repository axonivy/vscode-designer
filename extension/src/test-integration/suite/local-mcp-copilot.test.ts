import assert from 'assert';
import { execFile } from 'child_process';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);
const EXTENSION_ID = 'axonivy.vscode-designer-14';
const MCP_BASE_URL = 'http://127.0.0.1:32140';
const MCP_URL = `${MCP_BASE_URL}/mcp`;

/**
 * Evaluates whether a real AI coding agent discovers and correctly invokes our Axon Ivy tools from a
 * natural-language prompt alone — no scripted tool name or arguments. MCP protocol/routing correctness
 * (listTools, tools/call, session handling) is already covered by src/ai/tools/local-mcp.test.ts (vitest,
 * mocked engine); this suite is the only place that exercises real tool pickup by a real model.
 *
 * Uses the real GitHub Copilot CLI (`@github/copilot`, npx-installed, no Docker needed since Node 24 is
 * available). Requires a real GitHub account with Copilot access (via GH_TOKEN) and consumes real Copilot
 * usage — skipped automatically unless GH_TOKEN is set.
 */
suite('Local MCP Server — AI-driven tool pickup (exploratory)', () => {
  let projectsDir: string;
  let projectPath: string;

  suiteSetup(async function () {
    if (!process.env.GH_TOKEN) {
      this.skip();
      return;
    }
    // Engine runs embedded (axonivy.engine.runByExtension: true), so activation includes a cold engine boot.
    this.timeout(180_000);
    await waitForExtensionActive();
    await waitForMcpHealth();

    // Created under the open workspace folder (not os.tmpdir()) so the run is visible in the Explorer.
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    assert.ok(workspaceRoot, 'expected a workspace folder to be open');
    projectsDir = await fs.promises.mkdtemp(path.join(workspaceRoot, 'copilot-mcp-'));
  });

  suiteTeardown(async () => {
    if (projectsDir) {
      await fs.promises.rm(projectsDir, { recursive: true, force: true });
    }
  });

  test('picks up new_axon_ivy_project from a prompt', async function () {
    this.timeout(120_000);
    await runCopilotPrompt(
      `Create an Axon Ivy project named copilot-demo at ${projectsDir}, group id com.test, project id com.test.copilot`,
      projectsDir
    );

    projectPath = path.join(projectsDir, 'copilot-demo');
    assert.ok(fs.existsSync(path.join(projectPath, 'pom.xml')), 'expected Copilot to create the project via the MCP tool');
  });

  test('picks up new_axon_ivy_data_class from a prompt', async function () {
    this.timeout(120_000);
    const before = await countMatches(projectPath, '**/*.d.json');

    await runCopilotPrompt(`In the Axon Ivy project at ${projectPath}, create a data class named Customer in namespace demo.data`, projectPath);

    const after = await countMatches(projectPath, '**/*.d.json');
    assert.ok(after > before, 'expected Copilot to create a new .d.json data class file via the MCP tool');
  });

  test('picks up new_axon_ivy_process from a prompt', async function () {
    this.timeout(120_000);
    const before = await countMatches(projectPath, '**/*.p.json');

    await runCopilotPrompt(
      `In the Axon Ivy project at ${projectPath}, create a business process named HandleRequest in namespace demo.processes`,
      projectPath
    );

    const after = await countMatches(projectPath, '**/*.p.json');
    assert.ok(after > before, 'expected Copilot to create a new .p.json process file via the MCP tool');
  });

  test('picks up new_axon_ivy_dialog from a prompt', async function () {
    this.timeout(120_000);
    const before = await countMatches(projectPath, '**/*.xhtml');

    await runCopilotPrompt(
      `In the Axon Ivy project at ${projectPath}, create a form dialog named CustomerForm in namespace demo.forms`,
      projectPath
    );

    const after = await countMatches(projectPath, '**/*.xhtml');
    assert.ok(after > before, 'expected Copilot to create a new .xhtml dialog file via the MCP tool');
  });
});

async function waitForExtensionActive(): Promise<void> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `extension '${EXTENSION_ID}' was not found`);
  if (!extension.isActive) {
    await extension.activate();
  }
}

async function waitForMcpHealth(): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${MCP_BASE_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry below
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('LocalMcpServer did not become healthy within 30s');
}

async function countMatches(root: string, pattern: string): Promise<number> {
  const matches = await glob(pattern, { cwd: root });
  return matches.length;
}

async function runCopilotPrompt(prompt: string, addDir: string): Promise<void> {
  const mcpConfig = JSON.stringify({
    mcpServers: { 'axon-ivy': { url: MCP_URL, type: 'http' } }
  });

  const { stdout } = await execFileAsync(
    'npx',
    ['--yes', '@github/copilot', '-p', prompt, '--allow-all-tools', '--add-dir', addDir, '-s', '--additional-mcp-config', mcpConfig],
    { env: { ...process.env }, timeout: 100_000 }
  );

  console.log(`--- Copilot CLI transcript ("${prompt}") ---`);
  console.log(stdout);
  console.log('--- end transcript ---');
}

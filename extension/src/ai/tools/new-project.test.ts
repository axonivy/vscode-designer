import path from 'path';
import { expect, test, vi } from 'vitest';

const createProject = vi.fn().mockResolvedValue(undefined);

vi.mock('../../engine/engine-manager', () => ({
  IvyEngineManager: {
    get instance() {
      return { createProject };
    }
  }
}));

vi.mock('vscode', () => ({
  LanguageModelTextPart: class {
    constructor(public value: string) {}
  },
  LanguageModelToolResult: class {
    constructor(public content: unknown[]) {}
  },
  MarkdownString: class {
    constructor(public value: string) {}
  }
}));

import { createNewProject, NewProjectTool } from './new-project';

test('invoke creates a new project with resolved path', async () => {
  const tool = new NewProjectTool();
  const input = {
    name: 'DemoProject',
    path: '/tmp/ivy',
    groupId: 'com.acme',
    projectId: 'com.acme.demo'
  };

  const result = await tool.invoke({ input } as never);

  expect(createProject).toHaveBeenCalledWith({
    ...input,
    path: path.join(input.path, input.name)
  });
  expect((result as { content: Array<{ value: string }> }).content[0]?.value).toBe(
    `Project created successfully at '${path.join(input.path, input.name)}'`
  );
});

test('defaults an omitted project id to the project name', async () => {
  await createNewProject({
    name: 'DemoProject',
    path: '/tmp/ivy',
    groupId: 'com.acme'
  });

  expect(createProject).toHaveBeenCalledWith({
    name: 'DemoProject',
    path: path.join('/tmp/ivy', 'DemoProject'),
    groupId: 'com.acme',
    projectId: 'DemoProject'
  });
});

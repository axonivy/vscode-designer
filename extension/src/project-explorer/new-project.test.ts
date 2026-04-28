import { expect, test, vi } from 'vitest';
import type { LanguageModelTextPart, LanguageModelToolInvocationOptions } from 'vscode';
import { NewProjectTool, type NewProjectToolArgs } from './new-project';

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn()
  },
  LanguageModelTextPart: class {
    constructor(public value: string) {}
  },
  LanguageModelToolResult: class {
    constructor(public content: Array<LanguageModelTextPart>) {}
  }
}));

const { createProjectMock } = vi.hoisted(() => ({ createProjectMock: vi.fn() }));
vi.mock('../engine/engine-manager', () => ({
  IvyEngineManager: {
    instance: {
      createProject: createProjectMock
    }
  }
}));

test('NewProjectTool', async () => {
  const tool = new NewProjectTool();
  const result = await tool.invoke({
    input: { name: 'MyProject', path: '/workspace', groupId: 'com.example', projectId: 'my.project' }
  } as LanguageModelToolInvocationOptions<NewProjectToolArgs>);

  expect(createProjectMock).toHaveBeenCalledWith({
    name: 'MyProject',
    path: '/workspace/MyProject',
    groupId: 'com.example',
    projectId: 'my.project'
  });
  expect(result.content).toHaveLength(1);
  expect((result.content[0] as LanguageModelTextPart).value).toEqual('Project created successfully');
});

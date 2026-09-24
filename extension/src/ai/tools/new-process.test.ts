import { expect, test, vi } from 'vitest';

const createProcess = vi.fn().mockResolvedValue(undefined);

vi.mock('../../engine/engine-manager', () => ({
  IvyEngineManager: {
    get instance() {
      return { createProcess };
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
  },
  Uri: {
    parse: vi.fn()
  }
}));

import { createNewProcess } from './new-process';

test('defaults an omitted namespace to an empty string', async () => {
  const input = {
    name: 'treePlanting',
    projectPath: '/workspace/purchase',
    type: 'Business Process' as const
  };

  await createNewProcess(input);
  expect(createProcess).toHaveBeenCalledWith({
    name: 'treePlanting',
    namespace: '',
    path: '/workspace/purchase',
    kind: 'Business Process'
  });
});

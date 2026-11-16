import { beforeEach, expect, test, vi } from 'vitest';

const { mockInstallMarketProduct, mockStartEngine } = vi.hoisted(() => ({
  mockInstallMarketProduct: vi.fn(),
  mockStartEngine: vi.fn()
}));

vi.mock('vscode', () => ({
  l10n: { t: (message: string) => message },
  QuickPickItemKind: { Separator: -1 },
  LanguageModelTextPart: class {
    constructor(public value: string) { }
  },
  LanguageModelToolResult: class {
    constructor(public content: unknown[]) { }
  }
}));

vi.mock('../../engine/engine-manager', () => ({
  IvyEngineManager: { instance: { installMarketProduct: mockInstallMarketProduct, start: mockStartEngine } }
}));

import { importMarketProduct } from './import-market-product';

const productJson = JSON.stringify({
  installers: [
    {
      id: 'maven-import',
      data: {
        projects: [
          { groupId: 'org.example.demos', artifactId: 'sample-demo', importInWorkspace: false },
          { groupId: 'org.example.demos', artifactId: 'sample-demo-test', importInWorkspace: false },
          { groupId: 'org.example.demos', artifactId: 'unrequested-demo', importInWorkspace: false }
        ],
        repositories: [{ id: 'demo-repo', url: 'https://repo.example.com' }]
      }
    },
    {
      id: 'maven-dependency',
      data: {
        dependencies: [{ groupId: 'com.axonivy.utils', artifactId: 'unrelated' }]
      }
    }
  ]
});

beforeEach(() => {
  mockInstallMarketProduct.mockReset().mockResolvedValue(undefined);
  mockStartEngine.mockReset().mockResolvedValue(undefined);
});

test('imports only explicitly named artifactIds, ignoring workspace defaults', async () => {
  await importMarketProduct({
    productId: ['sample-demo', 'sample-demo-test'],
    productJson
  });

  expect(mockStartEngine).toHaveBeenCalledOnce();
  expect(mockInstallMarketProduct).toHaveBeenCalledOnce();
  const [input] = mockInstallMarketProduct.mock.calls[0] as [{ productJson: string; dependentProjectPath: string }];
  expect(input.dependentProjectPath).toBe('');
  const installers = JSON.parse(input.productJson).installers;
  expect(installers).toHaveLength(1);
  expect(installers[0]).toMatchObject({
    id: 'maven-import',
    data: {
      repositories: [{ id: 'demo-repo', url: 'https://repo.example.com' }],
      projects: [
        { artifactId: 'sample-demo', importInWorkspace: true },
        { artifactId: 'sample-demo-test', importInWorkspace: true },
        { artifactId: 'unrequested-demo', importInWorkspace: false }
      ]
    }
  });
});

test('rejects empty or unknown artifactId selections', async () => {
  await expect(importMarketProduct({ productId: [], productJson })).rejects.toThrow('non-empty list of artifactIds');
  await expect(importMarketProduct({ productId: ['unrelated'], productJson })).rejects.toThrow(
    'No Maven import project(s) found with artifactId(s): unrelated'
  );
  expect(mockInstallMarketProduct).not.toHaveBeenCalled();
});
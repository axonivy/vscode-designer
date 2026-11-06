import { beforeEach, expect, test, vi } from 'vitest';

const { mockInstallMarketProduct, mockStartEngine } = vi.hoisted(() => ({
  mockInstallMarketProduct: vi.fn(),
  mockStartEngine: vi.fn()
}));

vi.mock('vscode', () => ({
  l10n: { t: (message: string) => message },
  QuickPickItemKind: { Separator: -1 },
  LanguageModelTextPart: class {
    constructor(public value: string) {}
  },
  LanguageModelToolResult: class {
    constructor(public content: unknown[]) {}
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
          { groupId: 'org.example.demos', artifactId: 'sample-demo', version: '1.2.3', type: 'iar' },
          {
            groupId: 'org.example.demos',
            artifactId: 'sample-demo-test',
            version: '1.2.3',
            type: 'iar',
            importInWorkspace: false
          }
        ],
        repositories: [{ id: 'maven.axonivy.com', url: 'https://maven.axonivy.com', snapshots: { enabled: 'true' } }]
      }
    },
    {
      id: 'maven-dependency',
      data: {
        dependencies: [{ groupId: 'com.axonivy.utils', artifactId: 'unrelated', version: '1.0', type: 'iar' }]
      }
    }
  ]
});

beforeEach(() => {
  mockInstallMarketProduct.mockReset().mockResolvedValue(undefined);
  mockStartEngine.mockReset().mockResolvedValue(undefined);
});

test('imports workspace-selected Maven projects from any Market product', async () => {
  const result = await importMarketProduct({ productId: 'sample-demo-product', productJson });

  expect(result).toContain('org.example.demos:sample-demo');
  expect(mockStartEngine).toHaveBeenCalledOnce();
  expect(mockInstallMarketProduct).toHaveBeenCalledOnce();
  const [input] = mockInstallMarketProduct.mock.calls[0] as [{ productJson: string; dependentProjectPath: string }];
  expect(input.dependentProjectPath).toBe('');
  expect(JSON.parse(input.productJson)).toEqual({
    installers: [
      {
        id: 'maven-import',
        data: {
          projects: [
            {
              groupId: 'org.example.demos',
              artifactId: 'sample-demo',
              version: '1.2.3',
              type: 'iar',
              importInWorkspace: true
            },
            {
              groupId: 'org.example.demos',
              artifactId: 'sample-demo-test',
              version: '1.2.3',
              type: 'iar',
              importInWorkspace: false
            }
          ],
          repositories: [{ id: 'maven.axonivy.com', url: 'https://maven.axonivy.com', snapshots: { enabled: 'true' } }]
        }
      }
    ]
  });
});

test('rejects products without a Maven project selected for workspace import', async () => {
  const unrelatedProduct = JSON.stringify({
    installers: [
      {
        id: 'maven-import',
        data: { projects: [{ groupId: 'org.example.demos', artifactId: 'sample-demo-test', importInWorkspace: false }] }
      }
    ]
  });
  await expect(importMarketProduct({ productId: 'another-demo-product', productJson: unrelatedProduct })).rejects.toThrow(
    'contains no Maven import projects selected for workspace import'
  );
  expect(mockInstallMarketProduct).not.toHaveBeenCalled();
});
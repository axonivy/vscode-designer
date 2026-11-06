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
          { groupId: 'com.axonivy.demo', artifactId: 'connectivity-demos', version: '14.0.2-SNAPSHOT', type: 'iar' },
          {
            groupId: 'com.axonivy.demo',
            artifactId: 'connectivity-demos-test',
            version: '14.0.2-SNAPSHOT',
            type: 'iar',
            importInWorkspace: 'false'
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

test('installs only allowlisted projects through the Engine market client', async () => {
  const result = await importMarketProduct({ productId: 'connectivity-demo', productJson });

  expect(result).toContain('com.axonivy.demo:connectivity-demos');
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
              groupId: 'com.axonivy.demo',
              artifactId: 'connectivity-demos',
              version: '14.0.2-SNAPSHOT',
              type: 'iar',
              importInWorkspace: true
            },
            {
              groupId: 'com.axonivy.demo',
              artifactId: 'connectivity-demos-test',
              version: '14.0.2-SNAPSHOT',
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

test('rejects products outside the import allowlist', async () => {
  await expect(importMarketProduct({ productId: 'some-other-product', productJson })).rejects.toThrow('not allowed');
  expect(mockInstallMarketProduct).not.toHaveBeenCalled();
});

test('rejects allowlisted products without an approved import project', async () => {
  const unrelatedProduct = JSON.stringify({
    installers: [{ id: 'maven-import', data: { projects: [{ groupId: 'com.axonivy.demo', artifactId: 'connectivity-demos-test' }] } }]
  });
  await expect(importMarketProduct({ productId: 'connectivity-demo', productJson: unrelatedProduct })).rejects.toThrow(
    'contains no allowlisted Maven import projects'
  );
  expect(mockInstallMarketProduct).not.toHaveBeenCalled();
});
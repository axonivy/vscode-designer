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
          { groupId: 'org.example.demos', artifactId: 'sample-demo', version: '1.2.3', type: 'iar', importInWorkspace: false },
          {
            groupId: 'org.example.demos',
            artifactId: 'sample-demo-test',
            version: '1.2.3',
            type: 'iar',
            importInWorkspace: false
          },
          { groupId: 'org.example.demos', artifactId: 'unrequested-demo', version: '1.2.3', type: 'iar' }
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

test('imports only explicitly named artifactIds, ignoring workspace defaults', async () => {
  const result = await importMarketProduct({
    productId: ['sample-demo', 'sample-demo-test'],
    productJson,
  });

  expect(result).toContain('org.example.demos:sample-demo');
  expect(result).toContain('org.example.demos:sample-demo-test');
  expect(result).not.toContain('unrequested-demo');
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
              importInWorkspace: true
            },
            {
              groupId: 'org.example.demos',
              artifactId: 'unrequested-demo',
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

test('accepts a single artifactId', async () => {
  const result = await importMarketProduct({ productId: ['sample-demo'], productJson });

  expect(result).toContain('org.example.demos:sample-demo');
  expect(result).not.toContain('sample-demo-test');
});

test('rejects empty or unknown artifactId selections', async () => {
  await expect(importMarketProduct({ productId: [], productJson })).rejects.toThrow('non-empty list of unique artifactIds');
  await expect(importMarketProduct({ productId: ['unrelated'], productJson })).rejects.toThrow(
    'No Maven import project(s) found with artifactId(s): unrelated'
  );
  expect(mockInstallMarketProduct).not.toHaveBeenCalled();
});
import { expect, test } from 'vitest';
import {
  isIvyEnvironmentCompletionPrefix,
  isIvyEnvironmentRootCompletionPrefix,
  toJavaEnvironmentCompletionLabel,
  toJavaSourceContext
} from './ivy-script-java-translation';

const IVY_IMPORT = 'import ch.ivyteam.ivy.environment.Ivy;';

test('translates IvyScript task access and adjusts a position after the environment alias', () => {
  const code = 'ivy.task.customField()';
  const context = toJavaSourceContext(code, code.indexOf('customField') + 2);

  expect(context).toEqual({
    code: 'Ivy.wfTask().customField()',
    character: code.indexOf('customField') + 6,
    imports: [IVY_IMPORT]
  });
});

test('maps the IvyScript case and task members to their Java API methods', () => {
  expect(toJavaSourceContext('ivy.case.name + ivy.task.name', 0)).toEqual({
    code: 'Ivy.wfCase().name + Ivy.wfTask().name',
    character: 0,
    imports: [IVY_IMPORT]
  });
});

test('maps casemap to the generic Java service lookup and adds its type import', () => {
  const code = 'ivy.casemap.find()';
  const context = toJavaSourceContext(code, code.indexOf('find') + 1);

  expect(context).toEqual({
    code: 'Ivy.get(ICaseMapService.class).find()',
    character: code.indexOf('find') + 'Ivy.get(ICaseMapService.class)'.length - 'ivy.casemap'.length + 1,
    imports: [IVY_IMPORT, 'import ch.ivyteam.ivy.casemap.runtime.ICaseMapService;']
  });
});

test('maps the casemap alias itself to its Java service type', () => {
  const context = toJavaSourceContext('ivy.casemap.find()', 4);

  expect(context.character).toBe('Ivy.get(ICaseMapService.class)'.indexOf('ICaseMapService'));
});

test('translates the open Ivy environment prefix used for completions', () => {
  expect(toJavaSourceContext('ivy.', 4)).toEqual({
    code: 'Ivy.',
    character: 4,
    imports: [IVY_IMPORT]
  });
});

test('recognizes Ivy environment completion prefixes without matching similar identifiers', () => {
  expect(isIvyEnvironmentRootCompletionPrefix('ivy.')).toBe(true);
  expect(isIvyEnvironmentCompletionPrefix('ivy.')).toBe(true);
  expect(isIvyEnvironmentCompletionPrefix('ivy.t')).toBe(true);
  expect(isIvyEnvironmentCompletionPrefix('ivy.task.')).toBe(true);
  expect(isIvyEnvironmentCompletionPrefix('ivy.task.customFields')).toBe(true);
  expect(isIvyEnvironmentCompletionPrefix('myivy.task.')).toBe(false);
  expect(isIvyEnvironmentRootCompletionPrefix('ivy.task.')).toBe(false);
});

test('maps IvyScript completion aliases to the Java API labels', () => {
  expect(toJavaEnvironmentCompletionLabel('case')).toBe('wfCase');
  expect(toJavaEnvironmentCompletionLabel('task')).toBe('wfTask');
  expect(toJavaEnvironmentCompletionLabel('cal')).toBe('cal');
});

test('supports all standard Ivy environment accessors', () => {
  const members: Array<[string, string]> = [
    ['cal', 'cal'],
    ['cm', 'cm'],
    ['cms', 'cms'],
    ['datacache', 'datacache'],
    ['extensions', 'extensions'],
    ['html', 'html'],
    ['log', 'log'],
    ['persistence', 'persistence'],
    ['repo', 'repo'],
    ['request', 'request'],
    ['response', 'response'],
    ['rest', 'rest'],
    ['security', 'security'],
    ['session', 'session'],
    ['var', 'var'],
    ['wf', 'wf']
  ];
  const code = members.map(([member]) => `ivy.${member}`).join(' + ');

  expect(toJavaSourceContext(code, 0).code).toBe(members.map(([, method]) => `Ivy.${method}()`).join(' + '));
});

test('maps the cursor on the IvyScript task member to the corresponding Java method name', () => {
  expect(toJavaSourceContext('ivy.task.customField()', 4).character).toBe('Ivy.wfTask()'.indexOf('Task'));
});

test('preserves existing Ivy imports and leaves unknown or unrelated expressions unchanged', () => {
  const imports = ['import ch.ivyteam.ivy.environment.Ivy;'];
  expect(toJavaSourceContext('ivy.task.customField()', 12, imports).imports).toEqual(imports);
  expect(toJavaSourceContext('myIvy.task.customField()', 10)).toEqual({
    code: 'myIvy.task.customField()',
    character: 10,
    imports: []
  });
  expect(toJavaSourceContext('ivy.unknown()', 5)).toEqual({ code: 'ivy.unknown()', character: 5, imports: [] });
});

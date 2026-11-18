import { expect, test } from 'vitest';
import { toJavaSourceContext } from './ivy-script-java-translation';

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

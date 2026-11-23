import { describe, expect, test } from 'vitest';
import { normalizeIvyCompletionLabel, toJavaIvyContext } from './ivy-script-java-translation';

describe('toJavaIvyContext', () => {
  test('preserves ivy package segments in fully qualified Java names', () => {
    const code = 'ch.ivyteam.ivy.security.ISecurityContext.current()';
    const result = toJavaIvyContext(code, { line: 0, character: code.length }, []);
    expect(result.code).toBe(code);
    expect(result.position.character).toBe(code.length);
    expect(result.imports).toEqual([]);
  });

  test('only translates the standalone ivy environment receiver', () => {
    const code = 'out.ivy.task; $ivy.task; myivy.task; ivy.task.customFields()';
    expect(toJavaIvyContext(code, { line: 0, character: code.length }, []).code).toBe(
      'out.ivy.task; $ivy.task; myivy.task; Ivy.wfTask().customFields()'
    );
  });

  test('translates the bare Ivy member-completion receiver', () => {
    const result = toJavaIvyContext('ivy.', { line: 0, character: 4 }, []);
    expect(result.code).toBe('Ivy.');
    expect(result.position.character).toBe(4);
    expect(result.imports).toEqual(['import ch.ivyteam.ivy.environment.Ivy;']);
  });

  test('translates Ivy workflow objects and adds the Ivy import', () => {
    const code = 'ivy.task.customFields().stringField("branchOffice")';
    const result = toJavaIvyContext(code, { line: 0, character: code.length }, []);

    expect(result.code).toBe('Ivy.wfTask().customFields().stringField("branchOffice")');
    expect(result.imports).toEqual(['import ch.ivyteam.ivy.environment.Ivy;']);
    expect(result.position.character).toBe(result.code.length);
  });

  test('translates cases, case maps, and ordinary first-level Ivy methods', () => {
    expect(toJavaIvyContext('ivy.case.customFields()', { line: 0, character: 25 }, []).code).toBe('Ivy.wfCase().customFields()');
    const caseMap = toJavaIvyContext('ivy.casemap', { line: 0, character: 11 }, []);
    expect(caseMap.code).toBe('Ivy.get(ICaseMapService.class)');
    expect(caseMap.imports).toEqual(['import ch.ivyteam.ivy.environment.Ivy;', 'import ch.ivyteam.ivy.casemap.runtime.ICaseMapService;']);
    expect(toJavaIvyContext('ivy.session', { line: 0, character: 11 }, []).code).toBe('Ivy.session()');
  });

  test('keeps already-called Ivy methods and existing imports', () => {
    const imports = ['import ch.ivyteam.ivy.environment.Ivy;'];
    const result = toJavaIvyContext('ivy.task().customFields()', { line: 0, character: 9 }, imports);

    expect(result.code).toBe('Ivy.wfTask().customFields()');
    expect(result.imports).toEqual(imports);
    expect(result.position.character).toBe('Ivy.wfTask('.length);
  });

  test('matches Java workflow method documentation to IvyScript completion labels', () => {
    expect(normalizeIvyCompletionLabel('wfTask()')).toBe('task');
    expect(normalizeIvyCompletionLabel('wfCase()')).toBe('case');
  });

  test.each([
    ['ivy.task', 5, 'Ivy.wfT'],
    ['ivy.case', 5, 'Ivy.wfC'],
    ['ivy.session', 6, 'Ivy.se'],
    ['ivy.casemap', 6, 'Ivy.get(IC'],
    ['ivy.task', 8, 'Ivy.wfTask']
  ])('keeps definition cursors inside the translated identifier for %s', (code, character, prefix) => {
    const result = toJavaIvyContext(code, { line: 0, character }, []);
    expect(result.position.character).toBe(prefix.length);
  });

  test.each(['\n', '\r\n', '\r'])('maps multiline cursors with %j line endings', newline => {
    const code = ['ivy.task.customFields();', 'ivy.case.customFields();', 'ivy.session.getId();'].join(newline);
    const result = toJavaIvyContext(code, { line: 2, character: 'ivy.session.ge'.length }, []);
    expect(result.position).toEqual({ line: 2, character: 'Ivy.session().ge'.length });
  });

  test('translates the cursor offset when the prefix expands', () => {
    const code = 'ivy.task.customFields';
    const result = toJavaIvyContext(code, { line: 0, character: 'ivy.task.'.length }, []);

    expect(result.code).toBe('Ivy.wfTask().customFields');
    expect(result.position.character).toBe('Ivy.wfTask().'.length);
  });
});

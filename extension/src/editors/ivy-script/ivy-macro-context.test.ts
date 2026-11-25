import { describe, expect, test } from 'vitest';
import { macroScriptAtPosition } from './ivy-macro-context';

describe('macroScriptAtPosition', () => {
  test('extracts an expression and adjusts its cursor past the macro delimiter and surrounding text', () => {
    const macro = 'Case: <%= ivy.case.customFields() %>';
    expect(macroScriptAtPosition(macro, { line: 0, character: macro.indexOf('customFields') + 3 })).toEqual({
      code: ' ivy.case.customFields() ',
      position: { line: 0, character: ' ivy.case.cus'.length }
    });
  });

  test('selects only the expression under the cursor', () => {
    const macro = '<%= ivy.task.name %> and <%= ivy.case.customFields() %>';
    expect(macroScriptAtPosition(macro, { line: 0, character: macro.indexOf('customFields') + 1 })).toEqual({
      code: ' ivy.case.customFields() ',
      position: { line: 0, character: ' ivy.case.c'.length }
    });
  });

  test.each(['\n', '\r\n', '\r'])('maps multiline cursors with %j line endings', newline => {
    const macro = ['Description:', '<%= "case: " +', 'ivy.case.customFields()', '%>'].join(newline);
    expect(macroScriptAtPosition(macro, { line: 2, character: 12 })).toEqual({
      code: [' "case: " +', 'ivy.case.customFields()', ''].join(newline),
      position: { line: 1, character: 12 }
    });
  });

  test.each([
    'ivy.log.info("%>") + ivy.task.name',
    "'%>' + ivy.task.name",
    'ivy.log.info("escaped \\" %>") + ivy.task.name',
    '/* %> */ ivy.task.name',
    '// %>\nivy.task.name'
  ])('ignores delimiters inside strings and comments: %s', expression => {
    const macro = `<%= ${expression} %>`;
    const preceding = macro.slice(0, macro.indexOf('ivy.task') + 1).split('\n');
    expect(macroScriptAtPosition(macro, { line: preceding.length - 1, character: preceding.at(-1)?.length ?? 0 })?.code).toBe(
      ` ${expression} `
    );
  });

  test('allows definition lookup while a closing delimiter is still being typed', () => {
    const macro = '<%= ivy.task.customFields';
    expect(macroScriptAtPosition(macro, { line: 0, character: macro.length })).toEqual({
      code: ' ivy.task.customFields',
      position: { line: 0, character: ' ivy.task.customFields'.length }
    });
  });

  test.each([0, 5, 6, 7, 8, 22, 23, 24, 27])('does not treat plain text or delimiters as IvyScript (offset %s)', character => {
    expect(macroScriptAtPosition('Name: <%= ivy.task.id %> text', { line: 0, character })).toBeUndefined();
  });
});

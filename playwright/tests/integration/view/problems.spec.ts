import { test } from '~/fixtures/baseTest';
import { ProblemsView } from '~/page-objects/problems-view';
import { ProcessEditor } from '~/page-objects/process-editor';

test('Check existing warning and error', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage, 'Validation.p.json');
  await editor.open();
  const trigger = editor.elementByPID('18D9CDFA8F58DA2B-f3');
  await editor.hasWarning(trigger);
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasWarning('TriggerCall target is not defined.', '18D9CDFA8F58DA2B-f3');

  const script = editor.elementByPID('18D9CDFA8F58DA2B-f5');
  await editor.hasError(script);
  await problemsView.hasError('Output code: A statement is expected, not an expression (maybe missing semicolon)', '18D9CDFA8F58DA2B-f5');
});

test('Check live validation', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage, 'Validation.p.json');
  await editor.open();
  const pid = '18D9CDFA8F58DA2B-f7';
  const script = editor.elementByPID(pid);
  await editor.hasNoValidationMarker(script);
  const inscriptionView = await editor.openInscriptionView(pid);
  await inscriptionView.openInscriptionTab('Output');
  await inscriptionView.openCollapsible('Code');
  const monacoEditor = inscriptionView.monacoEditor;
  await monacoEditor.click();
  await wsPage.page.keyboard.type('make test error');
  await editor.hasError(script);
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasError("Output code: Unexpected token: identifier '", '18D9CDFA8F58DA2B-f7');
});

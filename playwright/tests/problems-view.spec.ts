import { ProcessEditor } from './page-objects/process-editor';
import { ProblemsView } from './page-objects/problems-view';
import { test } from './fixtures/baseTest';

test.describe('Problems View', () => {
  let processEditor: ProcessEditor;

  test.beforeEach(async ({ page }) => {
    processEditor = new ProcessEditor(page, 'Validation.p.json');
    await processEditor.hasDeployProjectStatusMessage();
    await processEditor.openEditorFile();
    await processEditor.isViewVisible();
    await processEditor.executeCommand('View: Focus into Panel');
  });

  test('Check existing warning and error', async ({ page }) => {
    const trigger = processEditor.locatorForPID('18D9CDFA8F58DA2B-f3');
    await processEditor.hasWarning(trigger);
    const problemsView = await ProblemsView.initProblemsView(page);
    await problemsView.hasWarning('TriggerCall target is not defined.', '18D9CDFA8F58DA2B-f3');

    const script = processEditor.locatorForPID('18D9CDFA8F58DA2B-f5');
    await processEditor.hasError(script);
    await problemsView.hasError('Output code: A statement is expected, not an expression (maybe missing semicolon)', '18D9CDFA8F58DA2B-f5');
    await problemsView.hasNoStatusMessage();
  });

  test('Check live validation', async ({ page }) => {
    const pid = '18D9CDFA8F58DA2B-f7';
    const script = processEditor.locatorForPID(pid);
    await processEditor.hasNoValidationMarker(script);
    const inscriptionView = await processEditor.openInscriptionView(pid);
    await inscriptionView.openInscriptionTab('Output');
    await inscriptionView.openCollapsible('Code');
    const monacoEditor = inscriptionView.monacoEditor();
    await monacoEditor.click();
    await inscriptionView.typeText('make test error');
    await processEditor.hasError(script);
    const problemsView = await ProblemsView.initProblemsView(page);
    await problemsView.hasError("Output code: Unexpected token: identifier '", '18D9CDFA8F58DA2B-f7');
  });
});

import fs from 'fs';
import path from 'path';
import { expect, test } from '~/fixtures/baseTest';
import { FormEditor } from '~/page-objects/form-editor';
import { ProblemsView } from '~/page-objects/problems-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { dependencyClashWorkspacePath } from '~/workspaces/workspace';

test('Check existing warning and error', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage, 'Validation.p.json');
  await editor.open();
  const trigger = editor.elementByPID('18D9CDFA8F58DA2B-f3');
  await editor.hasWarning(trigger);
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasWarning('TriggerCall target is not defined.');

  const script = editor.elementByPID('18D9CDFA8F58DA2B-f5');
  await editor.hasError(script);
  await problemsView.hasError('f5 > output.code: A statement is expected, not an expression (maybe missing semicolon)');
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
  await wsPage.executeCommand('File: Save');
  await editor.hasError(script);
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasError("f7 > output.code: Unexpected token: identifier '");
});

test('Worspace Validation', async ({ wsPage }) => {
  const editor = new FormEditor(wsPage);
  await editor.open();
  await editor.blockFor('input').click();
  await editor.quickBar.getByRole('button', { name: /Add new Component/ }).click();
  await editor.quickBarMenu.getByRole('textbox').fill('Button');
  await editor.quickBarMenu.locator('.ui-palette-item', { hasText: 'Button' }).click();
  await wsPage.page.keyboard.press('Escape');
  await editor.save();
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasError('Button action cannot be empty');
});

test.describe('IAR Dependency related errors', () => {
  test.use({ workspace: dependencyClashWorkspacePath });

  test('Ensure dependency clash and outdated dependency are reported', async ({ wsPage, tmpWorkspace }) => {
    const problemsView = await ProblemsView.initProblemsView(wsPage);
    await problemsView.hasError(
      "Dependency 'tel-search-ch-connector' has error: Project is outdated and needs to be converted. Update to a newer compatible version or import the project to VS Code to convert the project."
    );
    await problemsView.hasError("Dependency 'excel-connector' conflicts with a workspace project");
    await problemsView.hasError("Dependency 'tel-search-ch-connector' is available in multiple versions: 12.0.0, 13.2.0");

    for (const pomPath of [path.join(tmpWorkspace!.tmpWorkspacePath, 'project1', 'pom.xml'), path.join(tmpWorkspace!.tmpWorkspacePath, 'project2', 'pom.xml')]) {
      const pomContent = await fs.promises.readFile(pomPath, 'utf8');
      const pomWithoutDependencies = pomContent.replace(/^[ \t]*<dependencies>[\s\S]*?^[ \t]*<\/dependencies>\r?\n?/m, '');
      await fs.promises.writeFile(pomPath, pomWithoutDependencies);
    }

    const errorMarker = problemsView.view.locator('div.marker-icon.error');
    await expect(async () => {
      await wsPage.executeCommand('Axon Ivy: Refresh Project Explorer');
      await expect(errorMarker).toHaveCount(0, { timeout: 2000 });
    }).toPass();
  });
});

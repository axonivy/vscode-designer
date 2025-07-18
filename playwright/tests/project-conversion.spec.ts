import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { Editor } from './page-objects/editor';
import { OutputView } from './page-objects/output-view';
import { ProblemsView } from './page-objects/problems-view';
import { wait } from './utils/timeout';

const PREF_PREFIX = 'ch.ivyteam.ivy.project.preferences\\:PROJECT_VERSION=';

test('Convert project', async ({ page }) => {
  const editor = new Editor('ch.ivyteam.ivy.designer.prefs', page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.activeEditorHasText(PREF_PREFIX);
  await editor.executeCommand('Select All');
  const editorContainer = editor.editorContainer();
  await page.keyboard.press('Delete');
  await expect(editorContainer).not.toContainText(PREF_PREFIX);
  await page.keyboard.insertText(`${PREF_PREFIX}100000`);
  await editor.activeEditorHasText(`${PREF_PREFIX}100000`);
  await editor.saveAllFiles();
  await wait(page);
  await editor.executeCommand('Axon Ivy: Refresh Project Explorer');
  await editor.executeCommand('View: Focus into Panel');
  const problemsView = await ProblemsView.initProblemsView(page);
  await problemsView.hasError('Project is outdated and needs to be converted.');
  await editor.executeCommand('Axon Ivy: Convert Project');
  const quickPick = page.locator('div.quick-input-widget');
  await quickPick.getByRole('button').getByText('OK').click();
  const output = new OutputView(page);
  await expect(output.viewLocator).toContainText('[info] Finished conversion of project playwrightTestWorkspace');
  await editor.activeEditorHasText(PREF_PREFIX);
  await expect(editorContainer).not.toContainText(`${PREF_PREFIX}100000`);
  await problemsView.show();
  await problemsView.hasNoMarker();
});

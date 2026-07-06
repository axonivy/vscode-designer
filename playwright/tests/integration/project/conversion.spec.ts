import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { OutputView } from '~/page-objects/output-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { outdatedProjectWorkspacePath } from '~/workspaces/workspace';

test.use({ workspace: outdatedProjectWorkspacePath });

test('Convert project', async ({ wsPage }) => {
  const editor = new TextEditor(wsPage, 'ch.ivyteam.ivy.designer.prefs');
  await editor.open();
  await expect(editor.content).toContainText(`PROJECT_VERSION=120001`);
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasError('Project is too old. Needs to be converted in Axon Ivy Designer.');

  await wsPage.executeCommand('Axon Ivy: Convert Project');
  const quickPick = wsPage.page.locator('div.quick-input-widget');
  const firstQuickPickItem = quickPick.locator('div.quick-input-list-entry').first();
  await firstQuickPickItem.click();
  await quickPick.getByRole('button').getByText('OK').click();

  const output = new OutputView(wsPage);
  await output.view.press('ControlOrMeta+End');
  await output.expectLogEntry('[info] Finished conversion of project playwrightTestWorkspace');

  const ivyProjectEditor = new TextEditor(wsPage, '.ivyproject');
  await ivyProjectEditor.open();
  await expect(ivyProjectEditor.content).toContainText('version=');
  await problemsView.show();
  await problemsView.hasNoMarker();
});

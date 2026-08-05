import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { OutputView } from '~/page-objects/output-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { outdatedProjectWorkspacePath } from '~/workspaces/workspace';

test.use({ workspace: outdatedProjectWorkspacePath });

// eslint-disable-next-line
test.only('Convert project', async ({ wsPage }) => {
  test.setTimeout(60_000);
  const editor = new TextEditor(wsPage, 'ch.ivyteam.ivy.designer.prefs');
  await editor.open();
  await expect(editor.content).toContainText(`PROJECT_VERSION=120001`);
  const problemsView = await ProblemsView.initProblemsView(wsPage);
  await problemsView.hasError('Project is too old and needs to be converted in VS Code.');

  await wsPage.executeCommand('Axon Ivy: Convert Project');
  const quickPick = wsPage.page.locator('div.quick-input-widget');
  const firstQuickPickItem = quickPick.locator('div.quick-input-list-entry').first();
  await firstQuickPickItem.click();
  await quickPick.getByRole('button').getByText('OK').click();

  const successToast = wsPage.toasts.filter({ hasText: new RegExp('Converted 1 of 1 Axon Ivy project\\(s\\)') });
  await expect(successToast).toBeVisible();

  // await wsPage.page.waitForTimeout(5_000); // wait for conversion to finish
  const output = new OutputView(wsPage);

  // await output.view.press('ControlOrMeta+End');
  // await output.expectLogEntry('[info] Finished conversion of project playwrightTestWorkspace');

  await expect(async () => {
    await output.view.press('ControlOrMeta+End');
    await output.expectLogEntry('[info] Finished conversion of project playwrightTestWorkspace');
  }).toPass();

  const ivyProjectEditor = new TextEditor(wsPage, '.ivyproject');
  await ivyProjectEditor.open();
  await expect(ivyProjectEditor.content).toContainText('version=');
  await problemsView.show();
  await problemsView.hasNoMarker();
});

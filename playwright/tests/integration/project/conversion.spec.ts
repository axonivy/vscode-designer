import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { OutputView } from '~/page-objects/output-view';
import { ProblemsView } from '~/page-objects/problems-view';
import { minimalProjectWorkspacePath, outdatedProjectWorkspacePath } from '~/workspaces/workspace';

test.describe('Convert with error', () => {
  test.use({ workspace: outdatedProjectWorkspacePath });

  test('Convert project with error', async ({ wsPage }) => {
    const editor = new TextEditor(wsPage, 'ch.ivyteam.ivy.designer.prefs');
    await editor.open();
    await expect(editor.content).toContainText(`PROJECT_VERSION=120001`);
    const problemsView = await ProblemsView.initProblemsView(wsPage);
    await problemsView.hasError('Project is too old and needs to be converted in VS Code.');

    const javaStatusBar = wsPage.page.locator('div.statusbar-item[id*="redhat.java"]');
    await expect(javaStatusBar.filter({ hasText: 'Java: Lightweight Mode' })).toBeVisible();

    await wsPage.executeCommand('Axon Ivy: Convert Project');
    const quickPick = wsPage.page.locator('div.quick-input-widget');
    const firstQuickPickItem = quickPick.locator('div.quick-input-list-entry').first();
    await firstQuickPickItem.click();
    await quickPick.getByRole('button').getByText('OK').click();

    const successToast = wsPage.toasts.filter({ hasText: new RegExp('Converted 1 of 1 Axon Ivy project\\(s\\)') });
    await expect(successToast).toBeVisible();
    await expect(javaStatusBar.filter({ hasText: 'Java: Activating' })).toBeVisible();

    const output = new OutputView(wsPage);
    await expect(async () => {
      await output.view.press('ControlOrMeta+End');
      await output.expectLogEntry('[info] Finished conversion of project', 1_000);
    }).toPass();

    const ivyProjectEditor = new TextEditor(wsPage, '.ivyproject');
    await ivyProjectEditor.open();
    await expect(ivyProjectEditor.content).toContainText('version=');
    await problemsView.show();
    await problemsView.hasNumOfMarkers(0);
  });
});

test.describe('Convert with warning', () => {
  test.use({ workspace: minimalProjectWorkspacePath });

  test('Convert project with warning', async ({ wsPage, tmpWorkspace }) => {
    const problemsView = await ProblemsView.initProblemsView(wsPage);
    await problemsView.hasWarning('Jandex index');
    await problemsView.hasNumOfMarkers(1);

    fs.promises.writeFile(
      path.join(tmpWorkspace!.tmpWorkspacePath, '.ivyproject'),
      `name=minimalProject
version=140022`
    );

    await wsPage.executeCommand('Axon Ivy: Refresh Project Explorer');
    await problemsView.hasWarning('Project exists and ready to use, but is outdated.');
    await problemsView.hasNumOfMarkers(2);

    await wsPage.executeCommand('Axon Ivy: Convert Project');
    const quickPick = wsPage.page.locator('div.quick-input-widget');
    const firstQuickPickItem = quickPick.locator('div.quick-input-list-entry').first();
    await firstQuickPickItem.click();
    await quickPick.getByRole('button').getByText('OK').click();

    await problemsView.show();
    await problemsView.hasWarning('Jandex index');
    await problemsView.hasNumOfMarkers(1);
  });
});

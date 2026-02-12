import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { Editor } from './page-objects/editor';
import { OutputView } from './page-objects/output-view';
import { ProblemsView } from './page-objects/problems-view';
import { outdatedProjectWorkspacePath } from './workspaces/workspace';

test.describe('Project Conversion', () => {
  test.use({ workspace: outdatedProjectWorkspacePath });

  test('Convert project', async ({ page }) => {
    let editor = new Editor('ch.ivyteam.ivy.designer.prefs', page);
    await editor.hasDeployProjectStatusMessage();
    await editor.openEditorFile();
    await expect(editor.editorContent()).toContainText(`PROJECT_VERSION=120001`);
    const problemsView = await ProblemsView.initProblemsView(page);
    await problemsView.hasError('Project is outdated and needs to be converted.');
    await editor.executeCommand('Axon Ivy: Convert Project');
    const quickPick = page.locator('div.quick-input-widget');
    await quickPick.getByRole('button').getByText('OK').click();
    const output = new OutputView(page);
    await expect(output.viewLocator).toContainText('[info] Finished conversion of project playwrightTestWorkspace');

    editor = new Editor('.ivyproject', page);
    await editor.openEditorFile();
    await expect(editor.editorContent()).toContainText('version=');
    await problemsView.show();
    await problemsView.hasNoMarker();
  });
});

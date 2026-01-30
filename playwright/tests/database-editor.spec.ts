import { test } from './fixtures/baseTest';
import { DatabaseEditor } from './page-objects/database-editor';
import { FileExplorer } from './page-objects/explorer-view';
import { OutputView } from './page-objects/output-view';

test('Open by command', async ({ page }) => {
  const editor = new DatabaseEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await new FileExplorer(page).selectNode('config');
  await editor.executeCommand('Axon Ivy: Open Database Editor');
  await editor.isViewVisible();
  await editor.isImportWizardVisible();
});

test('Open by file', async ({ page }) => {
  const editor = new DatabaseEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.isViewVisible();
  await editor.isImportWizardVisible();
});

test('Open help', async ({ page }) => {
  const outputView = new OutputView(page);
  const editor = new DatabaseEditor(page);
  await editor.executeCommand('Axon Ivy: Open Database Editor');
  await outputView.openLog('Axon Ivy Extension');

  await editor.helpButton.click();
  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com\/.*\/databases\.html#database-editor/);
});

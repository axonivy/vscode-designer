import { test } from './fixtures/baseTest';
import { DatabaseEditor } from './page-objects/database-editor';
import { FileExplorer } from './page-objects/explorer-view';

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

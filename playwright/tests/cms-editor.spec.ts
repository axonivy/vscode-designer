import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { CmsEditor } from './page-objects/cms-editor';
import { Editor } from './page-objects/editor';
import { FileExplorer, ProjectExplorerView } from './page-objects/explorer-view';
import { OutputView } from './page-objects/output-view';

test('Open by command', async ({ page }) => {
  const editor = new CmsEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await new FileExplorer(page).selectNode('cms');
  await editor.executeCommand('Axon Ivy: Open CMS Editor');
  await editor.isViewVisible();
  await editor.hasContentObject('/contentObject');
});

test('Open by file and open text file', async ({ page }) => {
  const editor = new CmsEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isViewVisible();
  await editor.hasContentObject('/contentObject');

  const detail = await editor.rowByName('/File/Text').openInscription();
  await detail.getByRole('button', { name: 'Open File' }).click();
  const fileEditor = new Editor('Text_en.txt', page);
  await fileEditor.isTabVisible();
  await expect(fileEditor.editorContent()).toContainText(`This is a content object file`);
});

test('Open help', async ({ page }) => {
  const editor = new CmsEditor(page);
  await editor.openEditorFile();
  const outputView = new OutputView(page);
  await outputView.openLog('Axon Ivy Extension');
  await editor.help.click();

  await page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*cms\/cms-editor.html/);
});

test('Reuse and reveal existing panel', async ({ page }) => {
  const editor = new CmsEditor(page);
  await editor.hasDeployProjectStatusMessage();

  const explorer = new FileExplorer(page);
  await explorer.selectNode('cms');
  await editor.executeCommand('Axon Ivy: Open CMS Editor');
  await editor.isViewVisible();

  await explorer.doubleClickNode('pom.xml');
  await editor.isInactive();
  await editor.openEditorFile();
  await editor.isViewVisible();
  await expect(editor.tabLocator).toHaveCount(1);

  await explorer.doubleClickNode('pom.xml');
  await editor.isInactive();
  const projectExplorer = new ProjectExplorerView(page);
  await projectExplorer.openView();
  await projectExplorer.selectNode('playwrightTestWorkspace');
  await projectExplorer.selectNode('cms');
  await editor.isViewVisible();
  await expect(editor.tabLocator).toHaveCount(1);
});

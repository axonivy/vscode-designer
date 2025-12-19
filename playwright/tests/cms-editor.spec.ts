import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { CmsEditor } from './page-objects/cms-editor';
import { FileExplorer, ProjectExplorerView } from './page-objects/explorer-view';

test('Open by command', async ({ page }) => {
  const editor = new CmsEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await new FileExplorer(page).selectNode('cms');
  await editor.executeCommand('Axon Ivy: Open CMS Editor');
  await editor.isViewVisible();
  await editor.hasContentObject('/contentObject');
});

test('Open by file and open help', async ({ page }) => {
  const editor = new CmsEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isViewVisible();
  await editor.hasContentObject('/contentObject');

  await editor.help.click();
  const browserView = new BrowserView(page);
  expect((await browserView.input().inputValue()).toString()).toMatch(/^https:\/\/developer\.axonivy\.com.*cms\/cms-editor.html$/);
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

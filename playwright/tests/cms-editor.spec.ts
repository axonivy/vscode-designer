import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { CmsEditor } from './page-objects/cms-editor';
import { FileExplorer } from './page-objects/explorer-view';

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
  await editor.isTabVisible();
  await editor.isViewVisible();
  await editor.hasContentObject('/contentObject');

  await editor.help.click();
  const browserView = new BrowserView(page);
  expect((await browserView.input().inputValue()).toString()).toMatch(/^https:\/\/developer\.axonivy\.com.*cms\/index.html$/);
});

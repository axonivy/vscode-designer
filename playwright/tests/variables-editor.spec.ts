import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { BrowserView } from './page-objects/browser-view';
import { VariablesEditor } from './page-objects/variables-editor';

test('Read, write and open help', async ({ page }) => {
  const editor = new VariablesEditor(page);
  await editor.hasDeployProjectStatusMessage();
  await editor.openEditorFile();
  await editor.isTabVisible();
  await editor.executeCommand('View: Reopen Editor With...', 'Axon Ivy Variables Editor');
  await editor.isViewVisible();

  await editor.hasKey('originalKey');
  await editor.hasValue('originalValue', false);
  const newValue = 'newTestValue';
  await editor.selectFirstRow();
  await editor.updateValue(newValue);
  await page.waitForTimeout(300);
  await editor.saveAllFiles();
  await editor.executeCommand('View: Reopen Editor With Text Editor');
  await editor.activeEditorHasText(`originalKey: ${newValue}`);

  await editor.executeCommand('View: Reopen Editor With...', 'Axon Ivy Variables Editor');
  const browserView = new BrowserView(page);
  await editor.viewFrameLoactor().getByRole('button', { name: /Help/ }).click();
  const helpLink = await browserView.input().inputValue();
  expect(helpLink).toMatch(/^https:\/\/developer\.axonivy\.com.*configuration\/variables\.html$/);
});

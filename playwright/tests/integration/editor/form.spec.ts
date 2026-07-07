import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { BrowserView } from '~/page-objects/browser-view';
import { TextEditor } from '~/page-objects/editor';
import { FormEditor } from '~/page-objects/form-editor';
import { OutputView } from '~/page-objects/output-view';

test('Edit input label', async ({ wsPage }) => {
  const editor = new FormEditor(wsPage);
  await editor.open();
  const text = editor.blockFor('text');
  await expect(text).toBeVisible();
  await expect(text).toHaveText('This is my test');
  await editor.expectTabNotDirty();

  const input = editor.blockFor('input');
  await input.dblclick();
  const labelProperty = editor.detail.getByLabel('Label');
  const newLabel = 'newTestLabel';
  await labelProperty.click();
  await labelProperty.fill(newLabel);
  await labelProperty.blur();
  await expect(input).toHaveText(newLabel);

  await editor.save();
  const xhtmlEditor = new TextEditor(wsPage, 'testForm.xhtml');
  await xhtmlEditor.open();
  await expect(xhtmlEditor.content).toContainText(`value="${newLabel}" />`);
});

test('Extract component and jump', async ({ wsPage }) => {
  const editor = new FormEditor(wsPage);
  await editor.open();
  await editor.blockFor('input').click();
  await editor.quickBar.getByRole('button', { name: /Add new Component/ }).click();
  await editor.quickBarMenu.getByRole('textbox').fill('Layout');
  await editor.quickBarMenu.locator('.ui-palette-item', { hasText: 'Layout' }).click();
  await wsPage.page.keyboard.press('Escape');
  const layout = editor.main.locator('.draggable:has(>.block-layout)');
  await expect(layout).toBeVisible();

  await layout.click();
  await editor.quickBar.getByRole('button', { name: /Extract/ }).click();
  const extractDialog = editor.webViewFrame.getByRole('dialog');
  await expect(extractDialog).toBeVisible();
  await extractDialog.getByLabel('Name', { exact: true }).fill('TestComponent');
  await extractDialog.getByRole('button', { name: 'Extract' }).click();
  await expect(extractDialog).toBeHidden();
  await expect(layout).toBeHidden();
  const composite = editor.blockFor('composite');
  await expect(composite).toBeVisible();

  await composite.click();
  await editor.quickBar.getByRole('button', { name: /Open Component/ }).click();
  const componentEditor = new FormEditor(wsPage, 'TestComponent.f.json', 1);
  await componentEditor.expectTabVisible();
  await componentEditor.expectTabActive();
  await componentEditor.expectWebViewVisible();
  await expect(componentEditor.main.locator('.draggable:has(>.block-layout)')).toBeVisible();
});

test('Open Help', async ({ wsPage }) => {
  const editor = new FormEditor(wsPage);
  await editor.open();
  await editor.blockFor('input').dblclick();
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');

  await editor.detail.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*user-dialogs\/form-editor\.html/);
});

test('Preview', async ({ wsPage }) => {
  const editor = new FormEditor(wsPage);
  await editor.open();
  const browserView = new BrowserView(wsPage, 1);
  await browserView.openDevWfUi();
  const browser = browserView.content;
  await expect(browser.locator('.layout-topbar-logo')).toBeVisible();
  await browserView.moveToSecondaryPanel();

  await expect(editor.main.locator('.selected')).toHaveCount(0);
  await editor.toolbar.getByRole('button', { name: 'Open Dialog Preview' }).click();
  await expect(browser.locator('#iFrameForm\\:frameTaskName')).toHaveText('Preview');
  const frame = browser.frameLocator('iframe');
  const input = frame.getByRole('textbox');
  await expect(input).toBeVisible();

  // TODO: test editor reopen
  // await editor.close();

  const overlay = frame.locator('#selectionOverlay');
  await expect(overlay).toHaveCount(0);
  await browser.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(1);
  await input.click();
  // TODO: update browser webview locator
  await expect(overlay).toHaveCount(1);
  await browser.locator('#iFrameForm\\:previewElementPicker').click();
  await expect(overlay).toHaveCount(0);

  // TODO: update editor webview locator
  // editor.updateWebViewFrameLocator(1);
  await editor.expectWebViewVisible();
  await expect(editor.main.locator('.selected')).toHaveCount(1);
});

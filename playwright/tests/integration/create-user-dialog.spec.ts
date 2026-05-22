import { expect } from '@playwright/test';
import { TextEditor } from '~/page-objects/text-editor';
import { test } from '../fixtures/baseTest';
import { FileExplorer } from '../page-objects/explorer-view';
import { FormEditor } from '../page-objects/form-editor';
import { ProcessEditor } from '../page-objects/process-editor';

test.describe('Create User Dialog', () => {
  let explorer: FileExplorer;
  let processEditor: ProcessEditor;
  const userDialogName = 'testCreateUserDialog';

  test.beforeEach(async ({ page }) => {
    explorer = new FileExplorer(page);
    await explorer.hasDeployProjectStatusMessage();
    processEditor = new ProcessEditor(page);
  });

  test('Add Html Dialog', async () => {
    await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test', 'Html Dialog (JSF)');
    await explorer.hasNode(`${userDialogName}.xhtml`);
    await explorer.hasNode(`${userDialogName}Data.d.json`);
    await explorer.hasNode(`${userDialogName}Process.p.json`);
    await explorer.isTabWithNameVisible(userDialogName + '.xhtml');
    await expect(processEditor.editorContent()).toContainText('>Html Dialog</a>');
    await explorer.doubleClickNode(`${userDialogName}Process.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:htmlDialogStart');
    await expect(start).toBeVisible();
  });

  test('Add Offline Dialog', async () => {
    await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test.offline', 'Offline Dialog (JSF)');
    await explorer.hasNode(`${userDialogName}.xhtml`);
    await explorer.hasNode(`${userDialogName}Data.d.json`);
    await explorer.hasNode(`${userDialogName}Process.p.json`);
    await explorer.isTabWithNameVisible(userDialogName + '.xhtml');
    await expect(processEditor.editorContent()).toContainText('>Offline Html Dialog</a>');
    await explorer.doubleClickNode(`${userDialogName}Process.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:htmlDialogStart');
    await expect(start).toBeVisible();
  });

  test('Add Form Dialog', async ({ wsPage }) => {
    await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test.form', 'Dialog Form');
    await explorer.hasNode(`${userDialogName}.f.json`);
    await explorer.hasNode(`${userDialogName}Data.d.json`);
    await explorer.hasNode(`${userDialogName}Process.p.json`);
    await explorer.isTabWithNameVisible(userDialogName + '.f.json');
    const formEditor = new FormEditor(wsPage, `${userDialogName}.f.json`);
    await formEditor.expectWebViewVisible();
    await explorer.doubleClickNode(`${userDialogName}Process.p.json`);
    const start = processEditor.locatorForElementType('g.start\\:htmlDialogStart');
    await expect(start).toBeVisible();
    const xhtmlEditor = new TextEditor(wsPage, `${userDialogName}.xhtml`);
    await xhtmlEditor.open();
    await xhtmlEditor.isTabVisible();
    await expect(xhtmlEditor.content).toContainText('<h:form id="form">');
  });
});

import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { FileExplorer } from '~/page-objects/explorer-view';
import { FormEditor } from '~/page-objects/form-editor';
import { ProcessEditor } from '~/page-objects/process-editor';

const userDialogName = 'testCreateUserDialog';

test('Add Html Dialog', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test', 'Html Dialog (JSF)');
  await explorer.hasNode(`${userDialogName}.xhtml`);
  await explorer.hasNode(`${userDialogName}Data.d.json`);
  await explorer.hasNode(`${userDialogName}Process.p.json`);
  await wsPage.isTabWithNameVisible(userDialogName + '.xhtml');
  const processEditor = new ProcessEditor(wsPage, `${userDialogName}Process.p.json`);
  await expect(processEditor.content).toContainText('>Html Dialog</a>');
  await explorer.doubleClickNode(`${userDialogName}Process.p.json`);
  const start = processEditor.elementByType('start:htmlDialogStart');
  await expect(start).toBeVisible();
});

test('Add Offline Dialog', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test.offline', 'Offline Dialog (JSF)');
  await explorer.hasNode(`${userDialogName}.xhtml`);
  await explorer.hasNode(`${userDialogName}Data.d.json`);
  await explorer.hasNode(`${userDialogName}Process.p.json`);
  await wsPage.isTabWithNameVisible(userDialogName + '.xhtml');
  const processEditor = new ProcessEditor(wsPage, `${userDialogName}Process.p.json`);
  await expect(processEditor.content).toContainText('>Offline Html Dialog</a>');
  await explorer.doubleClickNode(`${userDialogName}Process.p.json`);
  const start = processEditor.elementByType('start:htmlDialogStart');
  await expect(start).toBeVisible();
});

test('Add Form Dialog', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test.form', 'Dialog Form');
  await explorer.hasNode(`${userDialogName}.f.json`);
  await explorer.hasNode(`${userDialogName}Data.d.json`);
  await explorer.hasNode(`${userDialogName}Process.p.json`);
  await wsPage.isTabWithNameVisible(userDialogName + '.f.json');
  const formEditor = new FormEditor(wsPage, `${userDialogName}.f.json`);
  await formEditor.expectWebViewVisible();
  await explorer.doubleClickNode(`${userDialogName}Process.p.json`);
  const processEditor = new ProcessEditor(wsPage, `${userDialogName}Process.p.json`);
  const start = processEditor.elementByType('start:htmlDialogStart');
  await expect(start).toBeVisible();
  const xhtmlEditor = new TextEditor(wsPage, `${userDialogName}.xhtml`);
  await xhtmlEditor.open();
  await xhtmlEditor.expectTabVisible();
  await expect(xhtmlEditor.content).toContainText('<h:form id="form">');
});

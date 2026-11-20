import { expect } from '@playwright/test';
import path from 'path';
import { test } from '~/fixtures/baseTest';
import { TextEditor } from '~/page-objects/editor';
import { FileExplorer } from '~/page-objects/explorer-view';
import { FormEditor } from '~/page-objects/form-editor';
import { ProcessEditor } from '~/page-objects/process-editor';
import { customLayoutProjectPath } from '~/workspaces/workspace';

const userDialogName = 'testCreateUserDialog';

test('Add Html Dialog', async ({ wsPage }) => {
  const explorer = new FileExplorer(wsPage);
  await explorer.addUserDialog(userDialogName, 'ch.ivyteam.test', 'Html Dialog (JSF)');
  await explorer.hasNodeExact(`${userDialogName}.xhtml`);
  await explorer.hasNodeExact(`${userDialogName}Data.d.json`);
  await explorer.hasNodeExact(`${userDialogName}Process.p.json`);
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
  await explorer.hasNodeExact(`${userDialogName}.xhtml`);
  await explorer.hasNodeExact(`${userDialogName}Data.d.json`);
  await explorer.hasNodeExact(`${userDialogName}Process.p.json`);
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
  await explorer.hasNodeExact(`${userDialogName}.f.json`);
  await explorer.hasNodeExact(`${userDialogName}Data.d.json`);
  await explorer.hasNodeExact(`${userDialogName}Process.p.json`);
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

test('Dialog validation', async ({ wsPage }) => {
  // Validate Java Keywords Validation from Backend
  const explorer = new FileExplorer(wsPage);
  await explorer.addUserDialog('default', 'ch.ivyteam.test', 'Html Dialog (JSF)');
  await expect(wsPage.toasts.first()).toContainText("Error validating Artifact Name: The input 'default' is not allowed (Java keywords are not allowed)");

  // Validate duplicate
  await explorer.addUserDialog('testForm', 'ch.form.test', 'Html Dialog (JSF)');
  await expect(wsPage.quickInputMessage).toBeVisible();
  await expect(wsPage.quickInputMessage).toHaveText('A dialog with this name and namespace already exists in this project.');

  // Validate dataclass conflict
  await explorer.addUserDialog('formConflict', 'conflict', 'Html Dialog (JSF)');
  await expect(wsPage.quickInputMessage).toBeVisible();
  await expect(wsPage.quickInputMessage).toHaveText(
    `This dialogs dataclass '${path.join('conflict', 'formConflict', 'formConflictData.d.json')}' that would be created already exists in the project in the '/dataclass' directory.`
  );
});

test.describe('Custom layout', () => {
  test.use({ workspace: customLayoutProjectPath });

  test('custom template is listed', async ({ wsPage }) => {
    const explorer = new FileExplorer(wsPage);
    await explorer.selectNodeExact('webContent');
    await wsPage.executeCommand('Axon Ivy: New Html Dialog (JSF)');
    await wsPage.provideUserInput('customLayoutProject');
    await wsPage.provideUserInput(userDialogName);
    await wsPage.provideUserInput('ch.ivyteam.test.custom');

    await expect(wsPage.quickInputList.getByRole('option').first()).toContainText('Page Responsive Grid 2 Columns');
    await wsPage.provideUserInput();

    const templates = wsPage.quickInputList.getByRole('option');
    await expect(templates.first()).toContainText('frame-10');
    await expect(templates.last()).toContainText('customLayout');
    await wsPage.selectItemFromQuickPick('customLayout');

    await explorer.hasNodeExact(`${userDialogName}.xhtml`);
    await wsPage.isTabWithNameVisible(`${userDialogName}.xhtml`);
    const xhtmlEditor = new TextEditor(wsPage, `${userDialogName}.xhtml`);
    await expect(xhtmlEditor.content).toContainText('customLayout');
  });
});

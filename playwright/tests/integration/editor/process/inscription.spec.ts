import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { DatabaseEditor } from '~/page-objects/database-editor';
import { TextEditor } from '~/page-objects/editor';
import { OutputView } from '~/page-objects/output-view';
import { ProcessEditor } from '~/page-objects/process-editor';
import { RestClientEditor } from '~/page-objects/restclient-editor';
import { WebServiceClientEditor } from '~/page-objects/webservice-client-editor';

const userDialogPID1 = '15254DCE818AD7A2-f3';
const userDialogPID2 = '15254DCE818AD7A2-f14';
const userTaskPID = '15254DCE818AD7A2-f17';
const namespace = 'testNamespace';

const actionsProcessPID = '1A0F1ED6FCC52C9A';

test('Check Process Editor Connector', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  let element = editor.elementByPID(userDialogPID1);
  await expect(element).toBeVisible();
  await element.dblclick();
  const inscriptionView = editor.inscriptionView();
  await inscriptionView.assertViewVisible();
  await expect(inscriptionView.header).toHaveText('User Dialog - Enter Request');

  element = editor.elementByPID('15254DCE818AD7A2-f0');
  await element.click();
  await expect(inscriptionView.header).toHaveText('Start - start.ivp');
});

test('Change User Dialog display name', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  await inscriptionView.openInscriptionTab('General');

  const inputField = inscriptionView.inputFieldFor('Display name');
  await expect(inputField).toHaveText('Enter Request');
  const element = editor.elementByPID(userDialogPID1);
  await expect(element).toHaveText('Enter Request');

  const newDisplayName = 'a new display name for this test';
  await inputField.fill(newDisplayName);
  await expect(inputField).toHaveText(newDisplayName);
  await expect(element).toHaveText(newDisplayName);
});

test('Select all in inscription input without selecting process elements', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  await inscriptionView.openInscriptionTab('General');

  const inputField = inscriptionView.inputFieldFor('Display name');
  const inputText = 'select all in inscription input';
  const unrelatedElement = editor.elementByPID('15254DCE818AD7A2-f0');
  await inputField.fill(inputText);
  await inputField.focus();
  await wsPage.page.keyboard.press('ControlOrMeta+KeyA');

  await expect
    .poll(async () =>
      inputField.evaluate(input => {
        const field = input as HTMLInputElement;
        return [field.selectionStart, field.selectionEnd];
      })
    )
    .toEqual([0, inputText.length]);
  await expect(unrelatedElement).not.toHaveClass(/selected/);
});

test('OpenPage-Action - valid file - Means/Document Table', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  await inscriptionView.openInscriptionTab('General');

  await inscriptionView.openCollapsible('Means / Documents');
  await inscriptionView.clickButton('Add row');

  const firstRowURLCell = inscriptionView.cellInsideTable(0, 1);
  await firstRowURLCell.locator('input').fill('pom.xml');
  await inscriptionView.cellInsideTable(0, 0).click();
  await inscriptionView.clickButton('Open URL');
  const pomEditor = new TextEditor(wsPage, 'pom.xml');
  await pomEditor.expectTabVisible();
  await pomEditor.close();
});

test('OpenPage-Action in Browers - Open Help', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');

  await inscriptionView.clickButton('Open Help');
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*process-elements\/user-dialog\.html/);
});

test('Monaco Editor completion', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  await inscriptionView.openInscriptionTab('Output');
  await inscriptionView.openCollapsible('Code');
  const monacoEditor = inscriptionView.monacoEditor;
  await expect(monacoEditor).toBeVisible();

  await monacoEditor.click();
  const contentAssist = inscriptionView.monacoContentAssist;
  await expect(contentAssist).toBeHidden();
  await inscriptionView.triggerMonacoContentAssist();
  await expect(contentAssist).toBeVisible();

  await expect(monacoEditor).toHaveText('');
  await inscriptionView.writeToMonacoEditorWithCompletion('iv', 'ivy');
  await inscriptionView.writeToMonacoEditorWithCompletion('.l', 'log');
  await inscriptionView.writeToMonacoEditorWithCompletion('.de', 'debug(Object message,Throwable t)');
  await expect(monacoEditor).toHaveText('ivy.log.debug(message, t)');
});

test('Monaco Editor completion with JDT language server', async ({ wsPage }) => {
  test.setTimeout(60_000); // slow test due to java activation
  await wsPage.activateExpensiveJavaStandardMode();
  const editor = new ProcessEditor(wsPage);
  await editor.open();

  // Code Editor - import expected
  const inscriptionView = await editor.openInscriptionView('15254DCE818AD7A2-f0');
  await inscriptionView.openInscriptionTab('Start');
  await inscriptionView.openCollapsible('Code');
  const monacoEditor = inscriptionView.monacoEditor;
  await monacoEditor.click();
  await expect(monacoEditor).toHaveText('');
  await inscriptionView.writeToMonacoEditorWithCompletion('ISecurityCon', 'ISecurityContext');
  await inscriptionView.writeToMonacoEditorWithCompletion('.cur', 'current()');
  await expect(monacoEditor).toHaveText('import ch.ivyteam.ivy.security.ISecurityContext;ISecurityContext.current()');
  await inscriptionView.closeCollapsible('Code');
  await expect(monacoEditor).toBeHidden();

  // One liner - no import expected but fully qualified type
  await inscriptionView.parent.locator('div.script-input').focus();
  await expect(monacoEditor).toHaveText('');
  await inscriptionView.writeToMonacoEditorWithCompletion('ISecurityCont', 'ISecurityContext');
  await inscriptionView.writeToMonacoEditorWithCompletion('.cur', 'current()');
  await expect(monacoEditor).toHaveText('ch.ivyteam.ivy.security.ISecurityContext.current()');
});

test('Monaco Editor shortcuts', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  await inscriptionView.openInscriptionTab('Output');
  await inscriptionView.openCollapsible('Code');
  const monacoEditor = inscriptionView.monacoEditor;
  await expect(monacoEditor).toBeVisible();

  await monacoEditor.click();
  await expect(monacoEditor).toHaveText('');
  await wsPage.page.keyboard.type('hi');
  await wsPage.page.keyboard.press('ControlOrMeta+a');
  await wsPage.page.keyboard.press('ControlOrMeta+c');
  await wsPage.page.keyboard.press('ArrowRight');
  await wsPage.page.keyboard.press('ControlOrMeta+v');
  await expect(monacoEditor).toHaveText('hihi');

  await wsPage.page.keyboard.press('ControlOrMeta+a');
  await wsPage.page.keyboard.press('ControlOrMeta+x');
  await expect(monacoEditor).toBeEmpty();
  await wsPage.page.keyboard.press('ControlOrMeta+v');
  await expect(monacoEditor).toHaveText('hihi');

  await editor.expectTabDirty();
  await wsPage.page.keyboard.press('ControlOrMeta+s');
  await editor.expectTabNotDirty();

  await wsPage.page.keyboard.press('ControlOrMeta+a');
  await wsPage.page.keyboard.press('Delete');
  await expect(monacoEditor).toHaveText('');

  await editor.expectTabDirty();
  await wsPage.page.keyboard.press('ControlOrMeta+s');
  await editor.expectTabNotDirty();
});

test('Create new Sub Process', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView('15254DCE818AD7A2-f5');
  await inscriptionView.openInscriptionTab('Process');
  await inscriptionView.openCollapsible('Process start');
  const processStartField = inscriptionView.parent.getByRole('combobox');
  await expect(processStartField).toBeEmpty();
  await inscriptionView.clickButton('Create new Sub Process');
  const processName = 'subProcess';
  await expect(wsPage.quickInputTitle).toContainText('Callable Sub Process');
  await wsPage.provideUserInput(processName);
  await wsPage.provideUserInput(namespace);
  await editor.expectTabDirty();
  await editor.expectTabInactive();
  await editor.tab.click();
  await expect(processStartField).toHaveValue(`${namespace}/${processName}:call(prebuiltProject.Data)`);
});

test('Create new Buisness Process from Trigger Call', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage, 'Validation.p.json');
  await editor.open();
  const inscriptionView = await editor.openInscriptionView('18D9CDFA8F58DA2B-f3');
  await inscriptionView.openInscriptionTab('Process');
  await inscriptionView.openCollapsible('Process start');
  const processStartField = inscriptionView.parent.getByRole('combobox');
  await expect(processStartField).toBeEmpty();
  await inscriptionView.clickButton('Create new Trigger Process');
  await expect(wsPage.quickInputTitle).toContainText('Business Process');
});

test('Create Html Dialog', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID1);
  await inscriptionView.openInscriptionTab('Dialog');
  await inscriptionView.openCollapsible('Dialog');
  const dialogField = inscriptionView.parent.getByRole('combobox');
  await expect(dialogField).toBeEmpty();
  await inscriptionView.clickButton('Create new Html Dialog');
  const userDialogName = 'htmlDialog';
  await wsPage.provideUserInput('JSF');
  await wsPage.provideUserInput(userDialogName);
  await wsPage.provideUserInput();
  await wsPage.provideUserInput();
  await wsPage.provideUserInput();
  await editor.expectTabDirty();
  await editor.expectTabInactive();
  await wsPage.isTabWithNameVisible(`${userDialogName}.xhtml`);
  await editor.tab.click();
  await expect(dialogField).toHaveValue(`prebuiltProject.${userDialogName}:start(prebuiltProject.Data)`);
});

test('Create Form Dialog', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userDialogPID2);
  await inscriptionView.openInscriptionTab('Dialog');
  await inscriptionView.openCollapsible('Dialog');
  const dialogField = inscriptionView.parent.getByRole('combobox');
  await expect(dialogField).toBeEmpty();
  await inscriptionView.clickButton('Create new Html Dialog');
  const userDialogName = 'formDialog';
  await wsPage.provideUserInput('Form');
  await wsPage.provideUserInput(userDialogName);
  await wsPage.provideUserInput();
  await editor.expectTabDirty();
  await editor.expectTabInactive();
  await wsPage.isTabWithNameVisible(`${userDialogName}.f.json`);
  await editor.tab.click();
  await expect(dialogField).toHaveValue(`prebuiltProject.${userDialogName}:start(prebuiltProject.Data)`);
});

test('Create Offline Dialog', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView(userTaskPID);
  await inscriptionView.openInscriptionTab('Dialog');
  await inscriptionView.openCollapsible('Dialog');
  const dialogField = inscriptionView.parent.getByRole('combobox');
  await expect(dialogField).toBeEmpty();
  await inscriptionView.clickButton('Create new Html Dialog');
  const userDialogName = 'offlineDialog';
  await wsPage.provideUserInput('JSFOffline');
  await wsPage.provideUserInput(userDialogName);
  await wsPage.provideUserInput();
  await editor.expectTabDirty();
  await editor.expectTabInactive();
  await wsPage.isTabWithNameVisible(`${userDialogName}.xhtml`);
  await editor.tab.click();
  await expect(dialogField).toHaveValue(`prebuiltProject.${userDialogName}:start(prebuiltProject.Data)`);
});

test.describe('Open config actions', () => {
  test('Open Rest config', async ({ wsPage }) => {
    const restClientPid = `${actionsProcessPID}-f3`;

    const processEditor = new ProcessEditor(wsPage, 'Actions.p.json');
    const restClientEditor = new RestClientEditor(wsPage);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(restClientPid);
    await inscriptionView.openInscriptionTab('Request');
    await inscriptionView.clickButton('Open Rest config');
    await restClientEditor.expectTabActive();

    await processEditor.open();
    await restClientEditor.expectTabInactive();
    await inscriptionView.parent.getByRole('combobox', { name: 'Client' }).click();
    await processEditor.webViewFrame.getByRole('option', { name: 'personService' }).click();
    await inscriptionView.clickButton('Open Rest config');
    await restClientEditor.expectTabActive();

    await processEditor.open();
    await restClientEditor.expectTabInactive();
    await inscriptionView.clickButton('Create new Rest Client');
    await restClientEditor.expectTabActive();
  });

  test('Open WebService config', async ({ wsPage }) => {
    const webServicePid = `${actionsProcessPID}-f5`;

    const processEditor = new ProcessEditor(wsPage, 'Actions.p.json');
    const webServiceClientEditor = new WebServiceClientEditor(wsPage);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(webServicePid);
    await inscriptionView.openInscriptionTab('Request');
    await inscriptionView.clickButton('Open WebService config');
    await webServiceClientEditor.expectTabActive();

    await processEditor.open();
    await webServiceClientEditor.expectTabInactive();
    await inscriptionView.parent.getByRole('combobox', { name: 'Client' }).click();
    await processEditor.webViewFrame.getByRole('option', { name: 'technicalBackend' }).click();
    await inscriptionView.clickButton('Open WebService config');
    await webServiceClientEditor.expectTabActive();

    await processEditor.open();
    await webServiceClientEditor.expectTabInactive();
    await inscriptionView.clickButton('Create new WebService Client');
    await webServiceClientEditor.expectTabActive();
  });

  test('Open Database client', async ({ wsPage }) => {
    const databasePid = `${actionsProcessPID}-f7`;

    const processEditor = new ProcessEditor(wsPage, 'Actions.p.json');
    const databaseEditor = new DatabaseEditor(wsPage);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(databasePid);
    await inscriptionView.openInscriptionTab('Query');
    await inscriptionView.clickButton('Open Database Client');
    await databaseEditor.expectTabActive();

    await processEditor.open();
    await databaseEditor.expectTabInactive();
    await inscriptionView.parent.getByRole('combobox', { name: 'Database' }).click();
    await processEditor.webViewFrame.getByRole('option', { name: 'demo_db' }).click();
    await inscriptionView.clickButton('Open Database Client');
    await databaseEditor.expectTabActive();

    await processEditor.open();
    await databaseEditor.expectTabInactive();
    await inscriptionView.clickButton('Create new Database Client');
    await databaseEditor.expectTabActive();
  });

  test('Open custom field configuration', async ({ wsPage }) => {
    const startPid = `${actionsProcessPID}-f0`;

    const processEditor = new ProcessEditor(wsPage, 'Actions.p.json');
    const customFieldsEditor = new TextEditor(wsPage, 'custom-fields.yaml');

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(startPid);
    await inscriptionView.openInscriptionTab('Request');
    await inscriptionView.openCollapsible('Custom Fields');
    await inscriptionView.clickButton('Open custom field configuration');
    await customFieldsEditor.expectTabActive();

    await processEditor.open();
    await customFieldsEditor.expectTabInactive();
    await inscriptionView.parent.getByRole('cell').first().click();
    await inscriptionView.clickButton('Open custom field configuration');
    await customFieldsEditor.expectTabActive();
  });
});

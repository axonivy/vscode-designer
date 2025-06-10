import { expect } from '@playwright/test';
import { ProcessEditor } from './page-objects/process-editor';
import { BrowserView } from './page-objects/browser-view';
import { wait } from './utils/timeout';
import { test } from './fixtures/baseTest';

const userDialogPID1 = '15254DCE818AD7A2-f3';
const userDialogPID2 = '15254DCE818AD7A2-f14';
const userTaskPID = '15254DCE818AD7A2-f17';
const namespace = 'testNamespace';

test.describe('Inscription View', () => {
  let processEditor: ProcessEditor;

  test.beforeEach(async ({ page }) => {
    processEditor = new ProcessEditor(page);
    await processEditor.hasDeployProjectStatusMessage();
    await processEditor.openEditorFile();
    await processEditor.isViewVisible();
  });

  test('Check Process Editor Connector', async () => {
    let element = processEditor.locatorForPID(userDialogPID1);
    await expect(element).toBeVisible();
    await element.dblclick();
    const inscriptionView = processEditor.inscriptionView();
    await inscriptionView.assertViewVisible();
    await expect(inscriptionView.header()).toHaveText('User Dialog - Enter Request');

    element = processEditor.locatorForPID('15254DCE818AD7A2-f0');
    await element.click();
    await expect(inscriptionView.header()).toHaveText('Start - start.ivp');
  });

  test('Change User Dialog display name', async () => {
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.openInscriptionTab('General');

    const inputField = inscriptionView.inputFieldFor('Display name');
    await expect(inputField).toHaveText('Enter Request');
    const element = processEditor.locatorForPID(userDialogPID1);
    await expect(element).toHaveText('Enter Request');

    const newDisplayName = 'a new display name for this test';
    await inputField.clear();
    await inputField.fill(newDisplayName);
    await inputField.blur();
    await expect(inputField).toHaveText(newDisplayName);
    await expect(element).toHaveText(newDisplayName);
  });

  test('OpenPage-Action - valid file - Means/Document Table', async ({ page }) => {
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.openInscriptionTab('General');

    await inscriptionView.openCollapsible('Means / Documents');
    await inscriptionView.clickButton('Add row');

    const firstRowURLCell = inscriptionView.cellInsideTable(0, 3);
    await firstRowURLCell.locator('input').fill('pom.xml');
    await wait(page);
    await inscriptionView.cellInsideTable(0, 2).click();
    await wait(page);
    await inscriptionView.clickButton('Open URL');
    const activeTabElement = page.locator('.tab.active');
    await expect(activeTabElement).toHaveAttribute('data-resource-name', 'pom.xml');
    await activeTabElement.locator('.action-label.codicon.codicon-close').click();
  });

  test('OpenPage-Action in Browers - Open Help', async ({ page }) => {
    const browserView = new BrowserView(page);
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.clickButton('Open Help');
    expect((await browserView.input().inputValue()).toString()).toMatch(/^https:\/\/developer\.axonivy\.com.*process-elements\/user-dialog\.html$/);
  });

  test('Monaco Editor completion', async () => {
    await processEditor.executeCommand('View: Toggle Panel Visibility');
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.openInscriptionTab('Output');
    await inscriptionView.openCollapsible('Code');
    const monacoEditor = inscriptionView.monacoEditor();
    await expect(monacoEditor).toBeVisible();

    await monacoEditor.click();
    const contentAssist = inscriptionView.monacoContentAssist();
    await expect(contentAssist).toBeHidden();
    await inscriptionView.triggerMonacoContentAssist();
    await expect(contentAssist).toBeVisible();

    await expect(monacoEditor).toHaveText('');
    await inscriptionView.writeToMonacoEditorWithCompletion('iv', 'ivy');
    await inscriptionView.writeToMonacoEditorWithCompletion('.l', 'log');
    await inscriptionView.writeToMonacoEditorWithCompletion('.de', 'debug(Object message,Throwable t)');
    await expect(monacoEditor).toHaveText('ivy.log.debug(message, t)');
  });

  test('Create new Sub Process', async () => {
    const inscriptionView = await processEditor.openInscriptionView('15254DCE818AD7A2-f5');
    await inscriptionView.openInscriptionTab('Process');
    await inscriptionView.openCollapsible('Process start');
    const processStartField = inscriptionView.parent.getByRole('combobox');
    await expect(processStartField).toBeEmpty();
    await inscriptionView.clickButton('Create new Sub Process');
    const processName = 'subProcess';
    await inscriptionView.provideUserInput(`${namespace}/${processName}`);
    await processEditor.isDirty();
    await processEditor.isInactive();
    await processEditor.tabLocator.click();
    await expect(processStartField).toHaveValue(`${namespace}/${processName}:call(prebuiltProject.Data)`);
  });

  test('Create Html Dialog', async () => {
    await processEditor.hasNoStatusMessage();
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.openInscriptionTab('Dialog');
    await inscriptionView.openCollapsible('Dialog');
    const dialogField = inscriptionView.parent.getByRole('combobox');
    await expect(dialogField).toBeEmpty();
    await inscriptionView.clickButton('Create new Html Dialog');
    const userDialogName = 'htmlDialog';
    await inscriptionView.provideUserInput('JSF');
    await inscriptionView.provideUserInput(userDialogName);
    await inscriptionView.provideUserInput();
    await inscriptionView.provideUserInput();
    await inscriptionView.provideUserInput();
    await processEditor.isDirty();
    await processEditor.isInactive();
    await processEditor.isTabWithNameVisible(`${userDialogName}.xhtml`);
    await processEditor.tabLocator.click();
    await expect(dialogField).toHaveValue(`prebuiltProject.${userDialogName}:start(prebuiltProject.Data)`);
  });

  test('Create Form Dialog', async () => {
    await processEditor.hasNoStatusMessage();
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID2);
    await inscriptionView.openInscriptionTab('Dialog');
    await inscriptionView.openCollapsible('Dialog');
    const dialogField = inscriptionView.parent.getByRole('combobox');
    await expect(dialogField).toBeEmpty();
    await inscriptionView.clickButton('Create new Html Dialog');
    const userDialogName = 'formDialog';
    await inscriptionView.provideUserInput('Form');
    await inscriptionView.provideUserInput(userDialogName);
    await inscriptionView.provideUserInput();
    await processEditor.isDirty();
    await processEditor.isInactive();
    await processEditor.isTabWithNameVisible(`${userDialogName}.f.json`);
    await processEditor.tabLocator.click();
    await expect(dialogField).toHaveValue(`prebuiltProject.${userDialogName}:start(prebuiltProject.Data)`);
  });

  test('Create Offline Dialog', async () => {
    await processEditor.hasNoStatusMessage();
    const inscriptionView = await processEditor.openInscriptionView(userTaskPID);
    await inscriptionView.openInscriptionTab('Dialog');
    await inscriptionView.openCollapsible('Dialog');
    const dialogField = inscriptionView.parent.getByRole('combobox');
    await expect(dialogField).toBeEmpty();
    await inscriptionView.clickButton('Create new Html Dialog');
    const userDialogName = 'offlineDialog';
    await inscriptionView.provideUserInput('JSFOffline');
    await inscriptionView.provideUserInput(userDialogName);
    await inscriptionView.provideUserInput();
    await processEditor.isDirty();
    await processEditor.isInactive();
    await processEditor.isTabWithNameVisible(`${userDialogName}.xhtml`);
    await processEditor.tabLocator.click();
    await expect(dialogField).toHaveValue(`prebuiltProject.${userDialogName}:start(prebuiltProject.Data)`);
  });
});

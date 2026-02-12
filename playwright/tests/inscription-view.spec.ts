import { expect } from '@playwright/test';
import { test } from './fixtures/baseTest';
import { OutputView } from './page-objects/output-view';
import { ProcessEditor } from './page-objects/process-editor';
import { wait } from './utils/timeout';

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
    await inputField.fill(newDisplayName);
    await expect(inputField).toHaveText(newDisplayName);
    await expect(element).toHaveText(newDisplayName);
  });

  test('OpenPage-Action - valid file - Means/Document Table', async ({ page }) => {
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.openInscriptionTab('General');

    await inscriptionView.openCollapsible('Means / Documents');
    await inscriptionView.clickButton('Add row');

    const firstRowURLCell = inscriptionView.cellInsideTable(0, 1);
    await firstRowURLCell.locator('input').fill('pom.xml');
    await wait(page);
    await inscriptionView.cellInsideTable(0, 0).click();
    await wait(page);
    await inscriptionView.clickButton('Open URL');
    const activeTabElement = page.locator('.tab.active');
    await expect(activeTabElement).toHaveAttribute('data-resource-name', 'pom.xml');
    await activeTabElement.locator('.action-label.codicon.codicon-close').click();
  });

  test('OpenPage-Action in Browers - Open Help', async ({ page }) => {
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    const outputView = new OutputView(page);
    await outputView.openLog('Axon Ivy Extension');

    await inscriptionView.clickButton('Open Help');
    await page.keyboard.press('Escape');
    await outputView.expectLogEntry('Opening URL externally');
    await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*process-elements\/user-dialog\.html/);
  });

  test('Monaco Editor completion', async () => {
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

  test('Monaco Editor completion with JDT language server', async () => {
    await processEditor.activateExpensiveJavaStandardMode();

    // Code Editor - import expected
    const inscriptionView = await processEditor.openInscriptionView('15254DCE818AD7A2-f0');
    await inscriptionView.openInscriptionTab('Start');
    await inscriptionView.openCollapsible('Code');
    const monacoEditor = inscriptionView.monacoEditor();
    await monacoEditor.click();
    await expect(monacoEditor).toHaveText('');
    await inscriptionView.writeToMonacoEditorWithCompletion('ISecurityCon', 'ISecurityContext');
    await inscriptionView.writeToMonacoEditorWithCompletion('.cur', 'current()');
    await expect(monacoEditor).toHaveText('import ch.ivyteam.ivy.security.ISecurityContext;ISecurityContext.current()');
    await inscriptionView.closeCollapsible('Code');
    await expect(monacoEditor).toBeHidden();

    // One liner - no import expected but fully qualified type
    await inscriptionView.parent.locator('div.script-input').click();
    await expect(monacoEditor).toHaveText('');
    await inscriptionView.writeToMonacoEditorWithCompletion('ISecurityCont', 'ISecurityContext');
    await inscriptionView.writeToMonacoEditorWithCompletion('.cur', 'current()');
    await expect(monacoEditor).toHaveText('ch.ivyteam.ivy.security.ISecurityContext.current()');
  });

  test('Monaco Editor shortcuts', async ({ page }) => {
    const inscriptionView = await processEditor.openInscriptionView(userDialogPID1);
    await inscriptionView.openInscriptionTab('Output');
    await inscriptionView.openCollapsible('Code');
    const monacoEditor = inscriptionView.monacoEditor();
    await expect(monacoEditor).toBeVisible();

    await monacoEditor.click();
    await expect(monacoEditor).toHaveText('');
    await page.keyboard.type('hi');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+c');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ControlOrMeta+v');
    await expect(monacoEditor).toHaveText('hihi');

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+x');
    await expect(monacoEditor).toBeEmpty();
    await page.keyboard.press('ControlOrMeta+v');
    await expect(monacoEditor).toHaveText('hihi');

    await processEditor.isDirty();
    await page.keyboard.press('ControlOrMeta+s');
    await processEditor.isNotDirty();

    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await expect(monacoEditor).toHaveText('');

    await processEditor.isDirty();
    await page.keyboard.press('ControlOrMeta+s');
    await processEditor.isNotDirty();
  });

  test('Create new Sub Process', async () => {
    const inscriptionView = await processEditor.openInscriptionView('15254DCE818AD7A2-f5');
    await inscriptionView.openInscriptionTab('Process');
    await inscriptionView.openCollapsible('Process start');
    const processStartField = inscriptionView.parent.getByRole('combobox');
    await expect(processStartField).toBeEmpty();
    await inscriptionView.clickButton('Create new Sub Process');
    const processName = 'subProcess';
    await inscriptionView.provideUserInput(processName);
    await inscriptionView.provideUserInput(namespace);
    await processEditor.isDirty();
    await processEditor.isInactive();
    await processEditor.tabLocator.click();
    await expect(processStartField).toHaveValue(`${namespace}/${processName}:call(prebuiltProject.Data)`);
  });

  test('Create Html Dialog', async () => {
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

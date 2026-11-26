import { expect, type Locator } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { CmsEditor } from '~/page-objects/cms-editor';
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

const actionsProcess = 'Actions.p.json';
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
  const contentAssist = inscriptionView.monacoContentAssist;
  const javadoc = 'Gets the current security context.';
  await monacoEditor.click();
  await expect(monacoEditor).toHaveText('');
  await inscriptionView.writeToMonacoEditorWithCompletion('ISecurityCon', 'ISecurityContext');
  await inscriptionView.writeToMonacoEditorWithCompletion('.cur', 'current()');
  await expect(monacoEditor).toHaveText('import ch.ivyteam.ivy.security.ISecurityContext;ISecurityContext.current()');

  await wsPage.page.keyboard.press('ArrowLeft');
  await wsPage.page.keyboard.press('ArrowLeft');
  await wsPage.page.keyboard.press('ArrowLeft');
  await wsPage.page.keyboard.press('ControlOrMeta+K');
  await wsPage.page.keyboard.press('ControlOrMeta+I');
  await expect(inscriptionView.monacoHoverContents).toContainText(javadoc);
  await wsPage.page.keyboard.press('Escape');

  await inscriptionView.closeCollapsible('Code');
  await expect(monacoEditor).toBeHidden();

  // One liner - no import expected but fully qualified type
  await inscriptionView.parent.locator('div.script-input').focus();
  await expect(monacoEditor).toHaveText('');
  await inscriptionView.writeToMonacoEditorWithCompletion('ISecurityCont', 'ISecurityContext');
  await wsPage.page.keyboard.type('.cur', { delay: 50 });
  await expect(contentAssist).toBeVisible();
  await inscriptionView.expectMonacoCompletionDocumentation('current()', javadoc);
  await contentAssist.getByText('current()').first().locator('span.highlight').click();
  await expect(monacoEditor).toHaveText('ch.ivyteam.ivy.security.ISecurityContext.current()');

  await wsPage.page.keyboard.press('ArrowLeft');
  await wsPage.page.keyboard.press('ArrowLeft');
  await wsPage.page.keyboard.press('ArrowLeft');
  await wsPage.page.keyboard.press('ControlOrMeta+K');
  await wsPage.page.keyboard.press('ControlOrMeta+I');
  await expect(inscriptionView.monacoHoverContents).toContainText(javadoc);
  await wsPage.page.keyboard.press('Escape');
});

test('Monaco Editor IvyScript completion includes Java documentation', async ({ wsPage }) => {
  test.setTimeout(90_000); // slow test due to Java activation and documentation resolution
  await wsPage.activateExpensiveJavaStandardMode();
  const editor = new ProcessEditor(wsPage);
  await editor.open();

  const inscriptionView = await editor.openInscriptionView('15254DCE818AD7A2-f0');
  await inscriptionView.openInscriptionTab('Start');
  await inscriptionView.openCollapsible('Code');
  const monacoEditor = inscriptionView.monacoEditor;
  const contentAssist = inscriptionView.monacoContentAssist;
  await monacoEditor.click();

  const documentationByCompletion = {
    task: 'Returns the currently executed task.',
    case: 'Returns the currently executed case.',
    session: 'Returns the currently active session.'
  };
  for (const [completion, documentation] of Object.entries(documentationByCompletion)) {
    await wsPage.page.keyboard.type('ivy.', { delay: 50 });
    await expect(contentAssist).toBeVisible();
    await inscriptionView.expectMonacoCompletionDocumentation(completion, documentation);
    await wsPage.page.keyboard.press('Escape');
    await monacoEditor.click();
    await wsPage.page.keyboard.press('ControlOrMeta+a');
    await wsPage.page.keyboard.press('Backspace');
    await expect(monacoEditor).toBeEmpty();
  }
});

test('Missing Javadoc hint downloads dependency sources and refreshes Java', { tag: '@serial' }, async ({ wsPage }) => {
  test.setTimeout(180_000); // Java startup and optional Maven downloads can be slow on a cold repository.
  await wsPage.activateExpensiveJavaStandardMode();
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');
  await outputView.clearOutput();

  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView('15254DCE818AD7A2-f0');
  await inscriptionView.openInscriptionTab('Start');
  await inscriptionView.openCollapsible('Code');
  await inscriptionView.monacoEditor.click();
  // TestClass is a local fixture without Javadoc: the hint is independent of cached dependency sources.
  await wsPage.page.keyboard.type('TestCl', { delay: 50 });
  await expect(inscriptionView.monacoContentAssist).toBeVisible();
  await inscriptionView.expectMonacoCompletionDocumentation('TestClass', 'Javadoc is not available.');
  const link = inscriptionView.monacoCompletionDetails.locator('a[data-href="https://axonivy.invalid/download-dependency-sources"]');
  await expect(link).toBeVisible();
  await link.click();

  await outputView.openLog('Axon Ivy Extension');
  await outputView.expectLogEntry('Source download requested for');
  await outputView.expectLogEntry('Java project refresh requested for', 120_000);
});

test('Monaco definition navigation in scripts and macros', async ({ wsPage }) => {
  test.setTimeout(90_000);
  await wsPage.activateExpensiveJavaStandardMode();
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const inscriptionView = await editor.openInscriptionView('15254DCE818AD7A2-f0');
  await inscriptionView.openInscriptionTab('Start');
  await inscriptionView.openCollapsible('Code');

  await replaceCode(editor, 'import ch.ivyteam.ivy.security.ISecurityContext;\nISecurityContext.current()');
  await goToDefinition(editor, 'current', 'ISecurityContext.java');
  await replaceCode(editor, 'ivy.task');
  await goToDefinition(editor, 'task', 'Ivy.java');
  // Change the script and line count between lookups to detect stale JDT buffers.
  await replaceCode(editor, 'import ch.ivyteam.ivy.security.ISecurityContext;\nISecurityContext.current();\n\nivy.task.customFields();');
  await clickDefinition(editor, 'customFields', 'ITask.java');

  await editor.openInscriptionView(userTaskPID);
  await inscriptionView.openInscriptionTab('Task');
  await inscriptionView.openCollapsible('Name / Description');
  await inscriptionView.inputFieldFor('Name').focus();
  await replaceCode(editor, 'Task: <%= ivy.task.name %> Case: <%= ivy.case.customFields() %>');
  await goToDefinition(editor, 'customFields', 'ICase.java');
  // Close the target so hover can prove that it does not open a Java editor.
  const caseEditor = new TextEditor(wsPage, 'ICase.java');
  await caseEditor.tab.click();
  await caseEditor.close();
  await editor.tab.click();
  await inscriptionView.inputFieldFor('Name').focus();
  await replaceCode(editor, '<%= ivy.case.customFields() %>');
  await clickDefinition(editor, 'customFields', 'ICase.java');
});

async function replaceCode(editor: ProcessEditor, code: string) {
  const monacoEditor = editor.inscriptionView().monacoEditor;
  await monacoEditor.click();
  await editor.wsPage.page.keyboard.press('ControlOrMeta+a');
  await editor.wsPage.page.keyboard.insertText(code);
  await editor.wsPage.page.keyboard.press('Escape');
  await monacoEditor.click();
}

async function expectDefinition(editor: ProcessEditor, target: string) {
  await editor.wsPage.isTabWithNameVisible(target);
  await editor.expectTabInactive();
  // Return to the same inscription for the next lookup.
  await editor.tab.click();
}

async function goToDefinition(editor: ProcessEditor, word: string, target: string) {
  // Clicking the symbol places the caret without depending on line length or delimiters.
  await editor.inscriptionView().monacoEditor.getByText(word, { exact: false }).click();
  await editor.wsPage.page.keyboard.press('F12');
  await expectDefinition(editor, target);
}

async function clickDefinition(editor: ProcessEditor, word: string, target: string) {
  const { wsPage } = editor;
  const inscriptionView = editor.inscriptionView();
  // Leave the caret elsewhere; navigation must use the symbol under the mouse.
  await wsPage.page.keyboard.press('ControlOrMeta+a');
  await wsPage.page.keyboard.press('ArrowLeft');
  const symbol = inscriptionView.monacoEditor.getByText(word, { exact: false });
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await wsPage.page.keyboard.down(modifier);
  try {
    await symbol.hover();
    await expect(inscriptionView.parent.locator('.goto-definition-link')).toHaveText(word);
    await editor.expectTabActive();
    await expect(wsPage.page.locator('div.tab').filter({ hasText: target })).toHaveCount(0);
    await symbol.click();
  } finally {
    await wsPage.page.keyboard.up(modifier);
  }
  await expectDefinition(editor, target);
}

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
  const expectToHaveNoSelection = async (rows: Locator) => {
    for (let i = 0; i < (await rows.count()); i++) {
      await expect(rows.nth(i)).toHaveAttribute('data-state', 'unselected');
    }
  };

  test('Open Rest config', async ({ wsPage }) => {
    const restClientPid = `${actionsProcessPID}-f3`;

    const processEditor = new ProcessEditor(wsPage, actionsProcess);
    const restClientEditor = new RestClientEditor(wsPage, 1);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(restClientPid);
    await inscriptionView.openInscriptionTab('Request');
    await inscriptionView.clickButton('Open Rest config');
    await restClientEditor.expectTabActive();
    await expectToHaveNoSelection(restClientEditor.rows);

    await restClientEditor.close();
    await inscriptionView.parent.getByRole('combobox', { name: 'Client' }).click();
    await processEditor.webViewFrame.getByRole('option', { name: 'personService' }).click();
    await inscriptionView.clickButton('Open Rest config');
    await restClientEditor.expectTabActive();
    await expect(restClientEditor.rows.filter({ hasText: 'personService' })).toHaveAttribute('data-state', 'selected');

    await processEditor.open();
    await restClientEditor.expectTabInactive();
    await inscriptionView.clickButton('Create new Rest Client');
    await restClientEditor.expectTabActive();
    await expect(restClientEditor.webViewFrame.getByRole('dialog', { name: 'Add Rest Client' })).toBeVisible();
  });

  test('Open WebService config', async ({ wsPage }) => {
    const webServicePid = `${actionsProcessPID}-f5`;

    const processEditor = new ProcessEditor(wsPage, actionsProcess);
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

    const processEditor = new ProcessEditor(wsPage, actionsProcess);
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

    const processEditor = new ProcessEditor(wsPage, actionsProcess);
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

  test('Open CMS Editor', async ({ wsPage }) => {
    const startPid = `${actionsProcessPID}-f0`;

    const processEditor = new ProcessEditor(wsPage, actionsProcess);
    const cmsEditor = new CmsEditor(wsPage);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(startPid);
    await inscriptionView.openInscriptionTab('Request');
    await inscriptionView.clickButton('Open CMS Editor');
    await cmsEditor.expectTabActive();
  });

  test('Open Java Class config', async ({ wsPage }) => {
    await wsPage.activateExpensiveJavaStandardMode();

    const programPid = `${actionsProcessPID}-f12`;

    const processEditor = new ProcessEditor(wsPage, actionsProcess);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(programPid);
    await inscriptionView.openInscriptionTab('Java Bean');
    await inscriptionView.clickButton('Open Java Class config');
    await new TextEditor(wsPage, 'TestProgramExecutor.java').expectTabActive();

    await processEditor.open();
    await inscriptionView.parent.getByRole('combobox').click();
    await processEditor.webViewFrame.getByRole('option', { name: 'Wait' }).click();
    await inscriptionView.clickButton('Open Java Class config');
    await new TextEditor(wsPage, 'Wait.java').expectTabActive();
  });

  test('Open End Page', async ({ wsPage }) => {
    const endPid = `${actionsProcessPID}-f14`;

    const processEditor = new ProcessEditor(wsPage, actionsProcess);

    await processEditor.open();
    const inscriptionView = await processEditor.openInscriptionView(endPid);
    await inscriptionView.openInscriptionTab('End Page');
    await inscriptionView.clickButton('Open file');
    await new TextEditor(wsPage, 'test-end-page.html').expectTabActive();

    const cmsEditor = new CmsEditor(wsPage);

    await processEditor.open();
    await inscriptionView.parent.getByRole('textbox').fill('/TestEndPage');
    await inscriptionView.clickButton('Open file');
    await cmsEditor.expectTabActive();

    await processEditor.open();
    await cmsEditor.expectTabInactive();
    await inscriptionView.parent.getByRole('textbox').fill('/TestEndPage.ivc');
    await inscriptionView.clickButton('Open file');
    await cmsEditor.expectTabActive();
  });
});

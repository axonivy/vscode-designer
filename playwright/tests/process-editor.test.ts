import { expect, test } from 'playwright/test';
import { pageFor } from './fixtures/page';
import { ProcessEditor } from './page-objects/process-editor';
import { defaultWorkspacePath } from './workspaces/workspace';
import { Page } from '@playwright/test';
import { getCtrlOrMeta } from './utils/keyboard';
import { OutputView } from './page-objects/output-view';

const userDialogPID = '15254DCE818AD7A2-f3';

test.describe('Process Editor', () => {
  let processEditor: ProcessEditor;
  let page: Page;

  test.beforeAll(async ({}, testInfo) => {
    page = await pageFor(defaultWorkspacePath, testInfo.titlePath[1]);
    const outputView = new OutputView(page);
    await outputView.checkIfEngineStarted();
  });

  test.beforeEach(async () => {
    processEditor = new ProcessEditor(page);
    await processEditor.openEditorFile();
    await processEditor.isViewVisible();
  });

  test.afterEach(async () => {
    await processEditor.revertAndCloseEditor();
  });

  test.only('Check if User Dialog is visible', async () => {
    const userDialog = processEditor.locatorForPID(userDialogPID);
    await expect(userDialog).toBeVisible();
    await processEditor.isNotDirty();
  });

  test('Change User Dialog position', async () => {
    const userDialog = processEditor.locatorForPID(userDialogPID);
    const boundingBoxBefore = await userDialog.boundingBox();
    expect(boundingBoxBefore).toBeDefined();
    await userDialog.dragTo(userDialog, { force: true, targetPosition: { x: 1, y: 1 } });

    const boundingBoxAfter = await userDialog.boundingBox();
    expect(boundingBoxAfter).toBeDefined();
    expect(boundingBoxAfter!.x).not.toBe(boundingBoxBefore!.x);
    expect(boundingBoxAfter!.y).not.toBe(boundingBoxBefore!.y);
    await processEditor.isDirty();
  });

  test('Change display name of Request Start', async () => {
    const start = processEditor.locatorForPID('15254DCE818AD7A2-f0');
    const initialName = 'start.ivp';
    await expect(start).toHaveText(initialName);

    await start.click();
    await processEditor.typeText('l');
    await processEditor.page.keyboard.press(`${getCtrlOrMeta()}+KeyA`);
    await processEditor.typeText('a new test label');
    await start.click();
    await expect(start).not.toHaveText(initialName);
    await expect(start).toHaveText('a new test label');
    await processEditor.isDirty();
  });
});

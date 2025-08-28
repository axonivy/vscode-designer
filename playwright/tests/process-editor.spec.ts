import { expect } from 'playwright/test';
import { test } from './fixtures/baseTest';
import { ProcessEditor } from './page-objects/process-editor';
import { getCtrlOrMeta } from './utils/keyboard';

const userDialogPID = '15254DCE818AD7A2-f3';

// eslint-disable-next-line playwright/no-focused-test
test.describe.only('Process Editor', () => {
  let processEditor: ProcessEditor;

  test.beforeEach(async ({ page }) => {
    processEditor = new ProcessEditor(page);
    await processEditor.hasDeployProjectStatusMessage();
    await processEditor.openEditorFile();
    await processEditor.isViewVisible();
  });

  test('Check if User Dialog is visible', async () => {
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

  test('Jump into Call Sub', async () => {
    const callSub = processEditor.locatorForPID('15254DCE818AD7A2-f19');
    await callSub.click();
    await processEditor.typeText('j');
    const nestedScript = processEditor.locatorForPID('190E938617AE0413-f3');
    await expect(nestedScript).toBeVisible();
  });
});

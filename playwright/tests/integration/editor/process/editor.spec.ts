import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { ProcessEditor } from '~/page-objects/process-editor';

const userDialogPID = '15254DCE818AD7A2-f3';

test('Check if User Dialog is visible', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const userDialog = editor.elementByPID(userDialogPID);
  await expect(userDialog).toBeVisible();
  await editor.expectTabNotDirty();
});

test('Change User Dialog position', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const userDialog = editor.elementByPID(userDialogPID);
  const boundingBoxBefore = await userDialog.boundingBox();
  expect(boundingBoxBefore).toBeDefined();
  await userDialog.dragTo(userDialog, { force: true, targetPosition: { x: 1, y: 1 } });

  const boundingBoxAfter = await userDialog.boundingBox();
  expect(boundingBoxAfter).toBeDefined();
  expect(boundingBoxAfter!.x).not.toBe(boundingBoxBefore!.x);
  expect(boundingBoxAfter!.y).not.toBe(boundingBoxBefore!.y);
  await editor.expectTabDirty();
});

test('Change display name of Request Start', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const start = editor.elementByPID('15254DCE818AD7A2-f0');
  const initialName = 'start.ivp';
  await expect(start).toHaveText(initialName);

  await start.click();
  await wsPage.page.keyboard.press('KeyL');
  await wsPage.page.keyboard.press('ControlOrMeta+KeyA');
  await wsPage.page.keyboard.type('a new test label');
  await start.click();
  await expect(start).not.toHaveText(initialName);
  await expect(start).toHaveText('a new test label');
  await editor.expectTabDirty();
});

test('Jump into Call Sub', async ({ wsPage }) => {
  const editor = new ProcessEditor(wsPage);
  await editor.open();
  const callSub = editor.elementByPID('15254DCE818AD7A2-f19');
  await callSub.click();
  await wsPage.page.keyboard.press('KeyJ');
  const subEditor = new ProcessEditor(wsPage, 'CallMe.p.json', 1);
  const nestedScript = subEditor.elementByPID('190E938617AE0413-f3');
  await expect(nestedScript).toBeVisible();
});

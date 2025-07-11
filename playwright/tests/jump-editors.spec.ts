import { test } from './fixtures/baseTest';
import { FormEditor } from './page-objects/form-editor';
import { ProcessEditor } from './page-objects/process-editor';

test('Jump between editors', async ({ page }) => {
  const processEditor = new ProcessEditor(page, 'testFormProcess.p.json');
  const formEditor = new FormEditor(page, 'testForm.f.json');
  await processEditor.hasDeployProjectStatusMessage();
  await processEditor.openEditorFile();
  await processEditor.isViewVisible();
  await processEditor.toolbar.getByRole('button', { name: 'Open Form' }).click();
  await formEditor.isViewVisible();
  await formEditor.toolbar.getByRole('button', { name: 'Open Process' }).click();
  await processEditor.isViewVisible();
});

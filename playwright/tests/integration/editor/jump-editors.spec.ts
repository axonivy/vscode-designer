import { test } from '~/fixtures/baseTest';
import { DataClassEditor } from '~/page-objects/dataclass-editor';
import { FormEditor } from '~/page-objects/form-editor';
import { ProcessEditor } from '~/page-objects/process-editor';

test('Jump between editors', async ({ wsPage }) => {
  const processEditor = new ProcessEditor(wsPage, 'testFormProcess.p.json');
  const formEditor = new FormEditor(wsPage, 'testForm.f.json', 1);
  const dataClassEditor = new DataClassEditor(wsPage, 'testFormData.d.json', 1);
  await processEditor.open();
  await processEditor.toolbar.getByRole('button', { name: 'Open Form' }).click();
  await formEditor.expectWebViewVisible();
  await formEditor.toolbar.getByRole('button', { name: 'Open Data Class' }).click();
  await dataClassEditor.expectWebViewVisible();
  await dataClassEditor.toolbar.getByRole('button', { name: 'Open Process' }).click();
  await processEditor.expectWebViewVisible();
});

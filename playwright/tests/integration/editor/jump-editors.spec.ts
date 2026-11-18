import { test } from '~/fixtures/baseTest';
import { DataClassEditor } from '~/page-objects/dataclass-editor';
import { FormEditor } from '~/page-objects/form-editor';
import { ProcessEditor } from '~/page-objects/process-editor';
import { XhtmlEditor } from '~/page-objects/xhtml-editor';

// eslint-disable-next-line playwright/no-focused-test
test.only('Jump between editors', async ({ wsPage }) => {
  // Form
  const processEditor = new ProcessEditor(wsPage, 'testFormProcess.p.json');
  const formEditor = new FormEditor(wsPage, 'testForm.f.json', 1);
  const dataClassEditor = new DataClassEditor(wsPage, 'testFormData.d.json', 1);
  await processEditor.open();
  await processEditor.toolbar.getByRole('button', { name: 'Open Form' }).click();
  await formEditor.expectWebViewVisible();
  await formEditor.toolbar.getByRole('button', { name: 'Open Data Class' }).click();
  await dataClassEditor.expectWebViewVisible();
  await dataClassEditor.toolbar.getByRole('button', { name: 'Open Form' }).click();
  await formEditor.expectWebViewVisible();
  await formEditor.toolbar.getByRole('button', { name: 'Open Data Class' }).click();
  await dataClassEditor.expectWebViewVisible();
  await dataClassEditor.toolbar.getByRole('button', { name: 'Open Process' }).click();
  await processEditor.expectWebViewVisible();

  // XHTML jump to .xhtml files
  const dataClassEditorXhtml = new DataClassEditor(wsPage, 'testXhtmlData.d.json', 2);
  const xhtmlEditor = new XhtmlEditor(wsPage, 'testXhtml.xhtml');
  await dataClassEditorXhtml.open();
  await dataClassEditorXhtml.toolbar.getByRole('button', { name: 'Open Form' }).click();
  await xhtmlEditor.expectTabVisible();
});

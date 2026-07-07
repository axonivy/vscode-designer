import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { CaseMapEditor } from '~/page-objects/case-map-editor';
import { OutputView } from '~/page-objects/output-view';

test('Read, write', async ({ wsPage }) => {
  const editor = new CaseMapEditor(wsPage);
  await editor.open();

  await expect(editor.stages).toHaveCount(1);
  await editor.stages.first().dblclick({ position: { x: 10, y: 10 } });
  await editor.detail.getByRole('textbox', { name: 'Name' }).fill('my new name');
  await editor.save();
  await editor.expectTextContent('"name" : "my new name"');
});

test('Open help', async ({ wsPage }) => {
  const editor = new CaseMapEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');

  await editor.stages.first().dblclick({ position: { x: 10, y: 10 } });
  await editor.helpButton.click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*process-modeling\/casemap\.html/);
});

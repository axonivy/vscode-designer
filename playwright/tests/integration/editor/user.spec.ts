import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { OutputView } from '~/page-objects/output-view';
import { UserEditor } from '~/page-objects/user-editor';

test('Read, write', async ({ wsPage }) => {
  const editor = new UserEditor(wsPage);
  await editor.open();

  await expect(editor.rows.first()).toHaveText('wtWilliam TellTeamleader');
  await editor.rows.first().click();
  await editor.detail.getByRole('textbox', { name: 'Full Name' }).fill('my new full name');
  await editor.save();
  await editor.expectTextContent('FullName: my new full name');
});

test('Open Help', async ({ wsPage }) => {
  const editor = new UserEditor(wsPage);
  await editor.open();
  const outputView = new OutputView(wsPage);
  await outputView.openLog('Axon Ivy Extension');

  await editor.webViewFrame.getByRole('button', { name: /Help/ }).click();
  await wsPage.page.keyboard.press('Escape');
  await outputView.expectLogEntry('Opening URL externally');
  await outputView.expectLogEntry(/https:\/\/developer\.axonivy\.com.*configuration\/roles-users\.html/);
});

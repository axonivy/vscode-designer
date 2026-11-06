import { expect } from '@playwright/test';
import { test } from '~/fixtures/baseTest';
import { projectNameConflictPath } from '~/workspaces/workspace';

test.use({ workspace: projectNameConflictPath });

test('Project dir resolve to same name warn', async ({ wsPage }) => {
  await wsPage.executeCommand('Axon Ivy: Open Axon Ivy Extension Log');
  const extensionLogOutput = wsPage.page.getByRole('document', { name: 'Extension - Output' }).getByRole('code');
  await extensionLogOutput.click();
  await extensionLogOutput.press('ControlOrMeta+Home');

  await expect(extensionLogOutput).toContainText('Project names derived from file path conflict');
  await expect(extensionLogOutput).toContainText('"a-b" and "a.b" map to the same sanitized name "a-b"');

  //   const toastWarning = wsPage.toasts.filter({ hasText: new RegExp('Project names derived from file path conflict') });
  const toastWarning = wsPage.toasts.filter({ hasText: 'Project names derived from file path conflict' });
  await expect(toastWarning).toHaveCount(1);
  await expect(toastWarning).toContainText('"a-b" and "a.b" map to the same sanitized name "a-b"');

  const toastExplanation = wsPage.toasts.filter({ hasText: 'Project name is sanitized as follows' });
  await expect(toastExplanation).toHaveCount(1);
  await expect(toastExplanation).toContainText('All occurrences of ".iar" are removed.');
  await expect(toastExplanation).toContainText('Dots are replaced with hyphens.');
  await expect(toastExplanation).toContainText('Any character that is not a letter, digit, underscore, or hyphen is replaced with an underscore.');
  await expect(toastExplanation).toContainText('The resulting name is truncated to a maximum of 40 characters.');
});

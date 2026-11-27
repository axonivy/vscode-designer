import { randomBytes } from 'crypto';
import { expect, test } from '~/fixtures/baseTest';

test('Export Ivy Project .iar', async ({ wsPage }) => {
  await wsPage.executeCommand('Axon Ivy: Export Project Archive (.iar)', 'prebuiltProject');
  const exportNewFolderName = randomBytes(16).toString('hex');
  await wsPage.provideUserInput(`tmp/${exportNewFolderName}`);
  await wsPage.page.getByRole('button', { name: 'Ok' }).click();
  await wsPage.provideUserInput('testExportIar');
  await expect(wsPage.toasts.filter({ hasText: new RegExp('Project archive testExportIar has been exported to') })).toHaveCount(1);
});

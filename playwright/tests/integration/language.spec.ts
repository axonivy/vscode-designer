import { expect, test } from '~/fixtures/baseTest';
import { webViewFrameLocator } from '~/page-objects/webview-util';

test.skip(!process.env.RUN_IN_BROWSER);

test('extension labels and welcome page use the German display language', { tag: '@serial' }, async ({ wsPage }) => {
  await wsPage.executeCommand('Configure Display Language');
  await wsPage.quickInputBox.getByRole('textbox').fill('de');
  await wsPage.selectItemFromQuickPick('Deutsch');
  await wsPage.page.getByRole('dialog').getByRole('button', { name: 'Restart' }).click();

  await wsPage.hasStatusMessage('Axon Ivy: Verbunden');

  await wsPage.executeCommand('Axon Ivy: Willkommensseite öffnen');
  const welcomePage = webViewFrameLocator(wsPage);
  await expect(welcomePage.getByRole('checkbox', { name: 'Willkommensseite bei Aktivierung der Erweiterung anzeigen' })).toBeVisible();
  await expect(welcomePage.getByText('Willkommen beim Axon Ivy PRO Designer')).toBeVisible();

  await wsPage.executeCommand('Anzeigesprache konfigurieren');
  await wsPage.quickInputBox.getByRole('textbox').fill('en');
  await wsPage.selectItemFromQuickPick('English');
  await wsPage.page.getByRole('dialog').getByRole('button', { name: 'Neu starten' }).click();

  await wsPage.hasStatusMessage('Axon Ivy: Connected');
});

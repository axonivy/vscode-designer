import { expect, test } from '~/fixtures/baseTest';
import { webViewFrameLocator } from '~/page-objects/webview-util';

test.use({ isolatedUserDataDir: true, locale: 'de', workspace: null, closeWelcomePage: false });

test.skip(process.env.RUN_IN_BROWSER === 'true');

test('extension labels and welcome page use the German display language', { tag: '@serial' }, async ({ wsPage }) => {
  await wsPage.hasStatusMessage('Axon Ivy: Getrennt');

  await wsPage.executeCommand('Axon Ivy: Willkommensseite öffnen');
  const welcomePage = webViewFrameLocator(wsPage);
  await expect(welcomePage.getByRole('checkbox', { name: 'Willkommensseite bei Aktivierung der Erweiterung anzeigen' })).toBeVisible();
  await expect(welcomePage.getByText('Willkommen beim Axon Ivy PRO Designer')).toBeVisible();
});

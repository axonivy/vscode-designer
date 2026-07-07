import { expect, test } from '~/fixtures/baseTest';
import { BrowserView } from '~/page-objects/browser-view';

test('Toolbar and navigation', async ({ wsPage }) => {
  const view = new BrowserView(wsPage);

  const home = /home.xhtml/;
  const starts = /starts.xhtml/;
  await view.openDevWfUi();
  await expect(view.input).toHaveValue(/dev-workflow-ui/);
  await expect(view.input).toHaveValue(home);

  const startLink = view.content.locator('#menuform\\:sr_starts');
  await expect(startLink).toBeVisible();
  await startLink.click();
  await expect(view.input).toHaveValue(starts);

  await view.reload.click();
  await expect(view.input).toHaveValue(/vscodeBrowserReqId/);
  await expect(view.input).toHaveValue(starts);

  await view.back.click();
  await expect(view.input).toHaveValue(starts);

  await view.back.click();
  await expect(view.input).toHaveValue(home);

  await view.forward.click();
  await expect(view.input).toHaveValue(starts);
});

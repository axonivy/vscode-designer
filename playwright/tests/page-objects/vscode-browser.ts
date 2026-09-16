import { type ElectronApplication, type Page } from '@playwright/test';

type OpenBrowserOptions = { electronApp?: ElectronApplication; page?: Page };

export class VsCodeBrowser {
  constructor(readonly browserPage: Page) {}

  static async openBrowser(action: () => Promise<void>, { electronApp, page }: OpenBrowserOptions) {
    if (electronApp) {
      const [browserPage] = await Promise.all([electronApp.waitForEvent('window'), action()]);
      return new VsCodeBrowser(browserPage);
    }
    if (page) {
      const [browserPage] = await Promise.all([page.waitForEvent('popup'), action()]);
      return new VsCodeBrowser(browserPage);
    }
    throw new Error('Either electronApp or page must be provided');
  }

  reload() {
    return this.browserPage.reload();
  }
}

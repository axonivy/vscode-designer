import { expect, type Locator } from '@playwright/test';
import { webViewFrameLocator } from './webview-util';
import type { WorkspacePage } from './workspace-page';

export class WelcomePage {
  readonly showPageCheckbox: Locator;

  constructor(readonly wsPage: WorkspacePage) {
    this.showPageCheckbox = webViewFrameLocator(wsPage).getByRole('checkbox', { name: 'Show welcome page on extension activation' });
  }

  async open() {
    await this.wsPage.executeCommand('Axon Ivy: Open Welcome Page');
    await expect(this.showPageCheckbox).toBeVisible();
  }
}

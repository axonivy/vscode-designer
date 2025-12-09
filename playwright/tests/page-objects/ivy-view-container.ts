import type { Page } from '@playwright/test';
import { ProjectExplorerView } from './explorer-view';

export class IvyViewContainer {
  readonly page: Page;
  readonly projectExplorer: ProjectExplorerView;

  constructor(page: Page) {
    this.page = page;
    this.projectExplorer = new ProjectExplorerView(page);
  }

  async openViewContainer() {
    await this.page.locator('div.activitybar').getByRole('tab', { name: 'Axon Ivy Designer' }).click();
  }
}

import type { Page } from '@playwright/test';
import { ProjectExplorerView } from './explorer-view';
import { PageObject } from './page-object';

export class IvyViewContainer extends PageObject {
  readonly projectExplorer: ProjectExplorerView;

  constructor(page: Page) {
    super(page);
    this.projectExplorer = new ProjectExplorerView(page);
  }

  async openViewContainer() {
    await this.page.locator('div.activitybar').getByRole('tab', { name: 'Axon Ivy Designer' }).click();
  }
}

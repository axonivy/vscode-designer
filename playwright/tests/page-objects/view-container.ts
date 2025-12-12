import { expect, type Page } from '@playwright/test';
import { FileExplorer, ProjectExplorerView } from './explorer-view';
import { PageObject } from './page-object';

abstract class ViewContainer extends PageObject {
  constructor(
    private viewContainerName: string,
    page: Page
  ) {
    super(page);
  }

  async openViewContainer() {
    const tab = this.page.locator('div.activitybar').getByRole('tab', { name: this.viewContainerName });
    // Opening a view container is prone to fail if it is done directly after another action.
    // E.g. after opening a file or after having opened another view container.
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 100 });
    }).toPass({
      intervals: [100],
      timeout: 500
    });
  }
}

export class ExplorerViewContainer extends ViewContainer {
  readonly fileExplorer: FileExplorer;

  constructor(page: Page) {
    super('Explorer', page);
    this.fileExplorer = new FileExplorer(page);
  }
}

export class IvyViewContainer extends ViewContainer {
  readonly projectExplorer: ProjectExplorerView;

  constructor(page: Page) {
    super('Axon Ivy Designer', page);
    this.projectExplorer = new ProjectExplorerView(page);
  }
}

import type { Page } from '@playwright/test';
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
    await this.page.locator('div.activitybar').getByRole('tab', { name: this.viewContainerName }).click();
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

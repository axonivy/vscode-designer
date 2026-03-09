import type { Locator, Page } from '@playwright/test';
import { View, type ViewData } from './view';

const welcomePageViewData: ViewData = {
  tabSelector: 'div.tab:has-text("welcome-page")',
  viewSelector: 'body > div > div[data-parent-flow-to-element-id] >> visible=true'
};

export class WelcomePage extends View {
  readonly showPageCheckbox: Locator;

  constructor(page: Page) {
    super(welcomePageViewData, page);
    this.showPageCheckbox = this.viewFrameLocator().getByRole('checkbox', { name: 'Show welcome page on extension activation' });
  }
}

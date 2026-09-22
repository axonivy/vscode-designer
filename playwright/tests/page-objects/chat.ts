import { expect, type Locator } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export type ChatToolsGroup = 'Built-In' | 'Axon Ivy PRO Designer 14';

export class ChatPage {
  readonly chatArea: Locator;
  readonly toolsLocator: Locator;
  readonly skillsLocator: Locator;

  constructor(readonly wsPage: WorkspacePage) {
    this.chatArea = wsPage.page.locator('.interactive-session');
    this.toolsLocator = wsPage.page.getByText('Configure ToolsThe selected');
    this.skillsLocator = wsPage.page.locator('div.quick-input-widget');
  }

  async open() {
    await this.wsPage.executeCommand('Chat: Open Chat');
    await expect(this.chatArea).toBeVisible();
  }

  async toolsDialog() {
    await this.open();
    await this.wsPage.page.getByRole('button', { name: /Configure Tools/i }).click();
    await expect(this.toolsLocator).toBeVisible();
  }

  async skillsDialog() {
    await this.open();
    await this.wsPage.executeCommand('Chat: Configure Skills...');
    await expect(this.skillsLocator).toBeVisible();
  }

  async expandGroup(group: ChatToolsGroup, expanded: boolean) {
    const groupCheckbox = this.wsPage.page.getByRole('checkbox', { name: group, exact: true });
    await expect(groupCheckbox).toBeVisible();

    const isExpanded = (await groupCheckbox.getAttribute('aria-expanded')) === 'true';
    if (isExpanded !== expanded) {
      await groupCheckbox.click({ position: { x: 8, y: 8 } });
    }

    await expect(groupCheckbox).toHaveAttribute('aria-expanded', String(expanded));
  }
}

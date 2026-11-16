import { expect, type Locator } from '@playwright/test';
import type { WorkspacePage } from './workspace-page';

export class ChatPage {
  readonly chatArea: Locator;
  readonly skillsLocator: Locator;
  readonly customizationsLocator: Locator;

  constructor(readonly wsPage: WorkspacePage) {
    this.chatArea = wsPage.page.locator('.interactive-session');
    this.skillsLocator = wsPage.page.locator('div.quick-input-widget');
    this.customizationsLocator = wsPage.page.locator('.ai-customization-management-editor');
  }

  async open() {
    await this.wsPage.executeCommand('Chat: Open Chat');
    await expect(this.chatArea).toBeVisible();
  }

  async openCustomizationsTools() {
    await this.wsPage.executeCommand('Chat: Open Customizations');
    await this.wsPage.page.getByRole('listitem', { name: /^Tools(?:, \d+ items)?$/ }).click();
    await expect(this.wsPage.page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible();
  }

  async skillsDialog() {
    await this.open();
    await this.wsPage.executeCommand('Chat: Configure Skills...');
    await expect(this.skillsLocator).toBeVisible();
  }

  async setGroupExpanded(group: string, expanded: boolean, visibleChild?: string) {
    const groupItem = this.wsPage.page.getByRole('treeitem', { name: group, exact: true });
    await expect(groupItem).toBeVisible();
    const isExpanded = visibleChild ? await this.visibleEntry(visibleChild).isVisible() : await this.isGroupExpanded(group);
    if (isExpanded !== expanded) {
      await groupItem.click({ position: { x: visibleChild ? 44 : 8, y: 22 } });
    }

    if (visibleChild) {
      const child = this.visibleEntry(visibleChild);
      if (expanded) {
        await expect(child).toBeVisible();
      } else {
        await expect(child).toBeHidden();
      }
    } else {
      await expect(groupItem).toHaveAttribute('aria-expanded', String(expanded));
    }
  }

  async isGroupExpanded(group: string) {
    const groupItem = this.wsPage.page.getByRole('treeitem', { name: group, exact: true });
    const expanded = await groupItem.getAttribute('aria-expanded');
    return expanded === 'true';
  }

  private visibleEntry(child: string) {
    return this.wsPage.page.getByText(child, { exact: true });
  }
}

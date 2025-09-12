import { type Locator, type Page, expect } from '@playwright/test';
import { PageObject } from './page-object';

export class InscriptionView extends PageObject {
  constructor(
    page: Page,
    readonly parent: Locator
  ) {
    super(page);
  }

  async assertViewVisible() {
    await expect(this.parent).toBeVisible();
  }

  header(): Locator {
    return this.parent.locator('.header');
  }

  async openInscriptionTab(name: string) {
    const inscriptionTab = this.parent.getByRole('tab', { name: name });
    await expect(inscriptionTab).toBeVisible();
    if ((await inscriptionTab.getAttribute('aria-selected')) !== 'true') {
      await inscriptionTab.click();
    }
  }

  async openCollapsible(name: string) {
    const collapsible = this.parent.locator(`.ui-collapsible:has-text("${name}")`);
    await this.open(collapsible);
  }

  private async open(locator: Locator) {
    if ((await locator.getAttribute('data-state')) === 'closed') {
      await locator.click();
    }
    await expect(locator).toHaveAttribute('data-state', 'open');
  }

  inputFieldFor(label: string): Locator {
    return this.parent.getByLabel(label, { exact: true });
  }

  cellInsideTable(tableCount: number, cellCount: number): Locator {
    const firstTable = this.parent.getByRole('table').nth(tableCount);
    return firstTable.getByRole('cell').nth(cellCount);
  }

  async clickButton(label: string) {
    await this.parent.getByRole('button', { name: label }).click();
  }

  monacoEditor(): Locator {
    return this.parent.locator('.view-lines.monaco-mouse-cursor-text');
  }

  async triggerMonacoContentAssist() {
    await this.page.keyboard.press('Control+Space');
  }

  async writeToMonacoEditorWithCompletion(input: string, expectedCompletion: string) {
    await this.typeText(input);
    const contentAssist = this.monacoContentAssist();
    await expect(contentAssist).toBeVisible();
    await contentAssist.getByText(expectedCompletion, { exact: true }).locator('span.highlight').click();
    await expect(contentAssist).toBeHidden();
  }

  monacoContentAssist(): Locator {
    return this.parent.locator('div.editor-widget.suggest-widget');
  }
}

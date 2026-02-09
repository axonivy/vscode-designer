import { expect, type Locator, type Page } from '@playwright/test';
import { Editor } from './editor';
import { InscriptionView } from './inscription-view';

export class ProcessEditor extends Editor {
  constructor(page: Page, editorFile: string = 'ProcurementRequestUserTask.p.json') {
    super(editorFile, page);
  }

  override async isViewVisible() {
    await this.isTabVisible();
    await expect(this.graphLocator()).toBeVisible();
  }

  graphLocator() {
    return this.viewFrameLocator().locator('#sprotty .sprotty-graph');
  }

  get toolbar() {
    return this.viewFrameLocator().locator('.ivy-tool-bar');
  }

  locatorForPID(pid: string) {
    return this.graphLocator().locator(`[id$="_${pid}"]`);
  }

  locatorForElementType(type: string) {
    return this.graphLocator().locator(type);
  }

  async openInscriptionView(pid: string) {
    await this.locatorForPID(pid).click();
    const view = this.inscriptionView();
    if (await view.parent.isHidden()) {
      await this.viewFrameLocator().locator('#btn_inscription_toggle').click();
    }
    await view.assertViewVisible();
    return view;
  }

  inscriptionView() {
    return new InscriptionView(this.page, this.viewFrameLocator().locator('.inscription-ui-container'));
  }

  async startProcessAndAssertExecuted(startEvent: Locator, executedElement: Locator) {
    await startEvent.click();
    await expect(startEvent).toHaveClass(/selected/);
    const playButton = this.viewFrameLocator().locator('i.ivy.ivy-play').first();
    await playButton.click();
    await this.assertExecuted(executedElement);
  }

  async assertExecuted(element: Locator) {
    await expect(element).toHaveClass(/executed/);
  }

  async assertNotExecuted(element: Locator) {
    await expect(element).not.toHaveClass(/executed/);
  }

  async appendActivity(target: Locator, activityName: string) {
    await target.click();
    await expect(target).toHaveClass(/selected/);
    const activities = this.viewFrameLocator().getByTitle('Activities (A)');
    await activities.click();
    const newItemButton = this.viewFrameLocator().locator('div.quick-action-bar-menu').getByRole('button', { name: activityName }).first();
    await newItemButton.click();
  }

  async hasWarning(element: Locator) {
    await expect(element).toHaveClass(/warning/);
  }

  async hasError(element: Locator) {
    await expect(element).toHaveClass(/error/);
  }

  async hasNoValidationMarker(element: Locator) {
    await expect(element).not.toHaveClass(/warning/);
    await expect(element).not.toHaveClass(/error/);
  }
}

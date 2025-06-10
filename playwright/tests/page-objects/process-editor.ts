import { Page } from 'playwright-core';
import { expect } from 'playwright/test';
import { Editor } from './editor';
import { InscriptionView } from './inscription-view';
import { Locator } from '@playwright/test';

export class ProcessEditor extends Editor {
  constructor(page: Page, editorFile: string = 'ProcurementRequestUserTask.p.json') {
    super(editorFile, page);
  }

  override async isViewVisible() {
    await this.isTabVisible();
    await expect(this.graphLocator()).toBeVisible();
  }

  graphLocator() {
    return this.viewFrameLoactor().locator('#sprotty .sprotty-graph');
  }

  get toolbar() {
    return this.viewFrameLoactor().locator('.ivy-tool-bar');
  }

  locatorForPID(pid: string) {
    return this.graphLocator().locator(`[id$="_${pid}"]`);
  }

  locatorForElementType(type: string) {
    return this.graphLocator().locator(type);
  }

  async openInscriptionView(pid?: string) {
    if (pid) {
      await this.locatorForPID(pid).dblclick();
    } else {
      await this.viewFrameLoactor().locator('#btn_inscription_toggle').click();
    }
    const view = this.inscriptionView();
    await view.assertViewVisible();
    return view;
  }

  inscriptionView() {
    return new InscriptionView(this.page, this.viewFrameLoactor().locator('.inscription-ui-container'));
  }

  async startProcessAndAssertExecuted(startEvent: Locator, executedElement: Locator) {
    await startEvent.click();
    await expect(startEvent).toHaveClass(/selected/);
    const playButton = this.viewFrameLoactor().locator('i.ivy.ivy-play').first();
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
    const activities = this.viewFrameLoactor().getByTitle('Activities (A)');
    await activities.click();
    const newItemButton = this.viewFrameLoactor().locator('#activity-group').getByText(activityName, { exact: true });
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

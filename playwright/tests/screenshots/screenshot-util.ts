import { type Locator, type Page, expect } from '@playwright/test';

const dir = import.meta.dirname + '/target/screenshots';

export const screenshot = async (page: Page, name: string) => {
  const buffer = await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' });
  expect(buffer.byteLength).toBeGreaterThan(3000);
};

export const screenshotLocator = async (page: Page, locator: Locator, name: string, margin = 16) => {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not get bounding box for screenshot '${name}'`);
  }
  const buffer = await page.screenshot({
    path: `${dir}/${name}.png`,
    animations: 'disabled',
    clip: { x: box.x - margin, y: box.y - margin, width: box.width + margin * 2, height: box.height + margin * 2 }
  });
  expect(buffer.byteLength).toBeGreaterThan(3000);
};

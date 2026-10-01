import { type Locator, type Page, expect } from '@playwright/test';

const dir = import.meta.dirname + '/target/screenshots';

export const DEFAULT_MARGIN = 16;

export const screenshot = async (page: Page, name: string) => {
  const buffer = await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' });
  expect(buffer.byteLength).toBeGreaterThan(3000);
};

export const screenshotLocator = async (
  page: Page,
  locator: Locator,
  name: string,
  options?: { margin?: number; marginLeft?: number; marginRight?: number; marginBottom?: number; marginTop?: number }
) => {
  const margin = options?.margin ?? DEFAULT_MARGIN;
  const marginLeft = options?.marginLeft ?? margin;
  const marginRight = options?.marginRight ?? margin;
  const marginBottom = options?.marginBottom ?? margin;
  const marginTop = options?.marginTop ?? margin;
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not get bounding box for screenshot '${name}'`);
  }
  await screenshotClip(
    page,
    {
      x: box.x - marginLeft,
      y: box.y - marginTop,
      width: box.width + marginLeft + marginRight,
      height: box.height + marginTop + marginBottom
    },
    name
  );
};

export const screenshotClip = async (page: Page, clip: { x: number; y: number; width: number; height: number }, name: string) => {
  const buffer = await page.screenshot({
    path: `${dir}/${name}.png`,
    animations: 'disabled',
    clip
  });
  expect(buffer.byteLength).toBeGreaterThan(3000);
};

export const withViewportHeightRatio = async (page: Page, heightRatio: number, action: () => Promise<void>) => {
  const previousViewport = page.viewportSize();

  try {
    if (previousViewport) {
      await page.setViewportSize({
        width: previousViewport.width,
        height: Math.floor(previousViewport.height * heightRatio)
      });
    }
    await action();
  } finally {
    if (previousViewport) {
      await page.setViewportSize(previousViewport);
    }
  }
};

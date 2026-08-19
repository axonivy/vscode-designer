import { type Page, expect } from '@playwright/test';

const dir = import.meta.dirname + '/target/screenshots';

export const screenshot = async (page: Page, name: string) => {
  const buffer = await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' });
  expect(buffer.byteLength).toBeGreaterThan(3000);
};

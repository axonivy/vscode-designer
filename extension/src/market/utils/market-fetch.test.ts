import { describe, expect, it } from 'vitest';
import { resolveMarketAssetUrl } from './market-fetch';

describe('resolveMarketAssetUrl', () => {
  it('resolves relative paths against the market backend', () => {
    expect(resolveMarketAssetUrl('images/product.png')).toBe('https://market.axonivy.com/stable/images/product.png');
  });

  it('resolves origin-root paths against the market backend', () => {
    expect(resolveMarketAssetUrl('/images/product.png')).toBe('https://market.axonivy.com/images/product.png');
  });

  it('preserves fully qualified legacy URLs', () => {
    expect(resolveMarketAssetUrl('https://market.axonivy.com/images/product.png')).toBe('https://market.axonivy.com/images/product.png');
  });
});

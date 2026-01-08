import { findProductJsonContent, findProducts, findProductVersionsById, ProductModel } from './generated/market-client';

export type Product = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
};

export const MARKET_URL = 'https://market.axonivy.com/marketplace-service';

export async function searchMarketProduct(): Promise<Product[]> {
  const response = await findProducts({ isRESTClient: true, page: 0, size: 200, type: 'all', sort: [], language: 'en' });
  return (
    response.data._embedded?.products?.map((product: ProductModel) => ({
      id: product.id || '',
      name: product.names?.en || 'Unnamed Product',
      description: product.shortDescriptions?.en || '',
      logoUrl: product.logoUrl || ''
    })) || []
  );
}

export async function availableVersions(productId: string) {
  const response = await findProductVersionsById(productId, { isShowDevVersion: true });
  return response.data.map(v => v.version || '') || [];
}

export async function fetchInstaller(productId: string, version: string) {
  const response = await findProductJsonContent(productId, version);
  return JSON.stringify(response.data);
}

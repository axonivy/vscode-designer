import {
  findProductJsonContent,
  findProducts,
  findProductVersionsById,
  type MavenArtifactVersionModel,
  type ProductModel
} from './generated/market-client';

export type Product = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
};

export async function searchMarketProduct(): Promise<Product[]> {
  const response = await findProducts({ type: 'all', language: 'en' });
  return (
    response.data.map((product: ProductModel) => ({
      id: product.id || '',
      name: product.names?.en || 'Unnamed Product',
      description: product.shortDescriptions?.en || '',
      logoUrl: product.logoUrl || ''
    })) || []
  );
}

export async function availableVersions(productId: string) {
  const response = await findProductVersionsById(productId, { isShowDevVersion: true });
  const data = response.data as unknown as MavenArtifactVersionModel[];
  return data.map(v => v.version || '') || [];
}

export async function fetchInstaller(productId: string, productVersion: string) {
  const response = await findProductJsonContent(productId, { productVersion });
  return JSON.stringify(response.data);
}

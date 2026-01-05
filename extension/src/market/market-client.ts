import { logErrorMessage } from '../base/logging-util';

const marketApi = 'https://market.axonivy.com/marketplace-service/api';

export type Product = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
};

export async function searchMarketProduct() {
  const productList = `${marketApi}/product?type=all&sort=standard&keyword=&language=en&page=0&size=200&isRESTClient=true`;
  try {
    const response = await fetch(productList);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    const products = json?._embedded?.products ?? [];
    return products.map((product: { id: string; names: { en: string }; shortDescriptions: { en: string }; logoUrl?: string }) => ({
      id: product.id,
      name: product.names.en,
      description: product.shortDescriptions.en,
      logoUrl: product.logoUrl
    }));
  } catch (error) {
    logErrorMessage('Error fetching market product JSON: ' + (error instanceof Error ? error.message : String(error)));
    return [];
  }
}

export async function availableVersions(productId: string) {
  const versionUri = `${marketApi}/product-details/${productId}/versions?isShowDevVersion=true&designerVersion=14.0.0`;
  try {
    const response = await fetch(versionUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    if (Array.isArray(json)) {
      return json.map((entry: { version: string }) => entry.version);
    }
  } catch (error) {
    logErrorMessage('Error fetching product versions: ' + (error instanceof Error ? error.message : String(error)));
  }
  return [];
}

export async function fetchInstaller(productId: string, version: string) {
  try {
    const installUri = `${marketApi}/product-details/${productId}/${version}/json?designerVersion=14.0.0`;
    return fetch(installUri).then(installer => {
      if (!installer.ok) {
        throw new Error(`Failed to fetch: ${installer.status} ${installer.statusText}`);
      }
      return installer.text();
    });
  } catch (error) {
    logErrorMessage('Error fetching installer JSON: ' + (error instanceof Error ? error.message : String(error)));
    return '';
  }
}

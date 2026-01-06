const marketApi = 'https://market.axonivy.com/marketplace-service/api';

export type Product = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
};

export async function searchMarketProduct() {
  const productList = `${marketApi}/product?type=all&sort=standard&keyword=&language=en&page=0&size=200&isRESTClient=true`;
  const response = await fetch(productList);
  if (!response.ok) {
    throw new Error(`Failed to lookup market products: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  const products = json?._embedded?.products ?? [];
  return products.map((product: { id: string; names: { en: string }; shortDescriptions: { en: string }; logoUrl?: string }) => ({
    id: product.id,
    name: product.names.en,
    description: product.shortDescriptions.en,
    logoUrl: product.logoUrl
  }));
}

export async function availableVersions(productId: string) {
  const versionUri = `${marketApi}/product-details/${productId}/versions?isShowDevVersion=true&designerVersion=14.0.0`;
  const response = await fetch(versionUri);
  if (!response.ok) {
    throw new Error(`Failed to lookup versions for ${productId}: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (Array.isArray(json)) {
    return json.map((entry: { version: string }) => entry.version);
  }
  return [];
}

export async function fetchInstaller(productId: string, version: string) {
  const installUri = `${marketApi}/product-details/${productId}/${version}/json?designerVersion=14.0.0`;
  return fetch(installUri).then(installer => {
    if (!installer.ok) {
      throw new Error(`Failed to lookup installer for ${productId} version ${version}: ${installer.status} ${installer.statusText}`);
    }
    return installer.text();
  });
}

const MARKET_URL = 'https://market.axonivy.com/marketplace-service';

const getUrl = (contextUrl: string): string => {
  const base = MARKET_URL;
  const apiPrefix = '/api';
  if (contextUrl.startsWith(apiPrefix)) {
    return `${base}${contextUrl} `;
  }
  return `${base}${apiPrefix}${contextUrl} `;
};

const getBody = <T>(c: Response | Request): Promise<T> => {
  const contentType = c.headers.get('content-type');
  if (contentType && contentType.startsWith('application/') && contentType.includes('json')) {
    return c.json();
  }
  if (contentType && contentType.includes('application/octet-stream')) {
    return c.blob() as Promise<T>;
  }
  return c.text() as Promise<T>;
};

export const marketFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const requestUrl = getUrl(url);
  const requestInit: RequestInit = { ...options };
  const request = new Request(requestUrl, requestInit);
  const response = await fetch(request);
  const data = await getBody<T>(response);
  return { status: response.status, data } as T;
};

export default marketFetch;

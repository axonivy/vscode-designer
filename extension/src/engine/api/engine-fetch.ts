export type EngineRequestOptions = RequestInit & {
  baseURL?: string;
  responseType?: 'stream';
};

export class EngineRequestError extends Error {
  constructor(
    public readonly method: string,
    public readonly url: string,
    public readonly response?: { status: number; statusText: string; data: unknown },
    options?: ErrorOptions
  ) {
    super(response ? `Request failed with status code ${response.status}` : 'Engine request failed', options);
    this.name = 'EngineRequestError';
  }
}

const responseData = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    return text;
  }
};

export const engineFetch = async <T>(url: string, options: EngineRequestOptions = {}): Promise<T> => {
  const { baseURL, responseType, ...requestInit } = options;
  // Generated paths start with '/', but must not replace the engine's context path.
  const requestUrl = baseURL && !URL.canParse(url) ? `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}` : url;
  const method = requestInit.method?.toUpperCase() ?? 'GET';

  try {
    const response = await fetch(requestUrl, requestInit);
    if (!response.ok) {
      const data = await responseData(response);
      throw new EngineRequestError(method, requestUrl, { status: response.status, statusText: response.statusText, data });
    }

    const data = responseType === 'stream' ? response.body : await responseData(response);
    return { data, status: response.status, headers: response.headers } as T;
  } catch (cause) {
    if (cause instanceof EngineRequestError) {
      throw cause;
    }
    throw new EngineRequestError(method, requestUrl, undefined, { cause });
  }
};

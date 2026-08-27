import { AxiosError } from 'axios';
import { logErrorMessage } from '../../base/logging-util';

const requestUrl = (error: AxiosError) => {
  const url = error.config?.url;
  if (!url) {
    return 'unknown URL';
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(url)) {
    return url;
  }

  const baseURL = error.config?.baseURL;
  if (!baseURL) {
    return url;
  }
  return `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

const responseMessage = (error: AxiosError): unknown => {
  const data = error.response?.data;
  if (typeof data === 'object' && data !== null && 'errorMessage' in data && data.errorMessage != null) {
    return data.errorMessage;
  }
  return error;
};

export const handleAxiosError = (error: unknown, logError: boolean = true) => {
  if (error instanceof AxiosError) {
    const message = responseMessage(error);
    const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
    const status = error.response
      ? `${error.response.status}${error.response.statusText ? ` ${error.response.statusText}` : ''}`
      : `no response${error.code ? ` (${error.code})` : ''}`;
    const logDetails = message instanceof AxiosError ? message.message : String(message);
    const logMessage = `Request failed: ${method} ${requestUrl(error)} (${status}): ${logDetails}`;
    if (logError) {
      logErrorMessage(logMessage);
    }
    throw message;
  }
  throw error;
};

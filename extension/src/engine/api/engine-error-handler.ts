import { logErrorMessage } from '../../base/logging-util';
import { EngineRequestError } from './engine-fetch';

const responseMessage = (error: EngineRequestError): unknown => {
  const data = error.response?.data;
  if (typeof data === 'object' && data !== null && 'errorMessage' in data && data.errorMessage != null) {
    return data.errorMessage;
  }
  return error;
};

export const handleEngineError = (error: unknown, logError: boolean = true) => {
  if (error instanceof EngineRequestError) {
    const message = responseMessage(error);
    const status = error.response
      ? `${error.response.status}${error.response.statusText ? ` ${error.response.statusText}` : ''}`
      : 'no response';
    const logDetails =
      message instanceof EngineRequestError ? (message.cause instanceof Error ? message.cause.message : message.message) : String(message);
    const logMessage = `Request failed: ${error.method} ${error.url} (${status}): ${logDetails}`;
    if (logError) {
      logErrorMessage(logMessage);
    }
    throw message;
  }
  throw error;
};

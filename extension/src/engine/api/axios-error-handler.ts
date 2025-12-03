import { AxiosError } from 'axios';
import { logMessage } from '../../base/logging-util';

export const handleAxiosError = (error: unknown) => {
  if (error instanceof AxiosError) {
    const message = error.response?.data.errorMessage ?? error;
    logMessage('error', message);
    throw message;
  }
  throw error;
};

import { AxiosError } from 'axios';
import { logErrorMessage } from '../../base/logging-util';

export const handleAxiosError = (error: unknown, logError: boolean = true) => {
  if (error instanceof AxiosError) {
    const message = error.response?.data.errorMessage ?? error;
    if (logError) {
      logErrorMessage(message);
    }
    throw message;
  }
  throw error;
};

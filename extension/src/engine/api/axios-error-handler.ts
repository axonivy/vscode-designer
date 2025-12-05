import { AxiosError } from 'axios';
import { logErrorMessage } from '../../base/logging-util';

export const handleAxiosError = (error: unknown) => {
  if (error instanceof AxiosError) {
    const message = error.response?.data.errorMessage ?? error;
    logErrorMessage(message);
    throw message;
  }
  throw error;
};

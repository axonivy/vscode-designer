import { AxiosError } from 'axios';
import { logErrorMessage } from '../../base/logging-util';

export const handleAxiosError = (error: unknown, logErrorMsg: boolean = true) => {
  if (error instanceof AxiosError) {
    const message = error.response?.data.errorMessage ?? error;
    if (logErrorMsg) {
      logErrorMessage(message);
    }
    throw message;
  }
  throw error;
};

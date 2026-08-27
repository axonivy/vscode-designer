import { AxiosError, AxiosHeaders } from 'axios';
import { expect, test, vi } from 'vitest';

const { logErrorMessage } = vi.hoisted(() => ({ logErrorMessage: vi.fn() }));
vi.mock('../../base/logging-util', () => ({ logErrorMessage }));

import { handleAxiosError } from './axios-error-handler';

test('logs request details for an Axios response error', () => {
  const error = new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    { baseURL: 'http://localhost:8080/designer/api', url: '/workspaces', method: 'post', headers: new AxiosHeaders() },
    undefined,
    {
      status: 404,
      statusText: 'Not Found',
      data: { errorMessage: 'Workspace not found' },
      headers: {},
      config: { headers: new AxiosHeaders() }
    }
  );

  expect(() => handleAxiosError(error)).toThrow('Workspace not found');
  expect(logErrorMessage).toHaveBeenCalledWith(
    'Request failed: POST http://localhost:8080/designer/api/workspaces (404 Not Found): Workspace not found'
  );
});

test('logs request details when the server does not respond', () => {
  const error = new AxiosError('Network Error', 'ERR_NETWORK', {
    baseURL: 'http://localhost:8080',
    url: '/api/version',
    method: 'get',
    headers: new AxiosHeaders()
  });

  expect(() => handleAxiosError(error)).toThrow(error);
  expect(logErrorMessage).toHaveBeenCalledWith(
    'Request failed: GET http://localhost:8080/api/version (no response (ERR_NETWORK)): Network Error'
  );
});

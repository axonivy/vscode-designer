import { beforeEach, expect, test, vi } from 'vitest';

const { logErrorMessage } = vi.hoisted(() => ({ logErrorMessage: vi.fn() }));
vi.mock('../../base/logging-util', () => ({ logErrorMessage }));

import { handleEngineError } from './engine-error-handler';
import { EngineRequestError } from './engine-fetch';

beforeEach(() => vi.clearAllMocks());

test('logs request details for an HTTP response error', () => {
  const error = new EngineRequestError('POST', 'http://localhost:8080/designer/api/workspaces', {
    status: 404,
    statusText: 'Not Found',
    data: { errorMessage: 'Workspace not found' }
  });

  expect(() => handleEngineError(error)).toThrow('Workspace not found');
  expect(logErrorMessage).toHaveBeenCalledWith(
    'Request failed: POST http://localhost:8080/designer/api/workspaces (404 Not Found): Workspace not found'
  );
});

test('logs request details when the server does not respond', () => {
  const error = new EngineRequestError('GET', 'http://localhost:8080/api/version', undefined, {
    cause: new TypeError('fetch failed')
  });

  expect(() => handleEngineError(error)).toThrow(error);
  expect(logErrorMessage).toHaveBeenCalledWith('Request failed: GET http://localhost:8080/api/version (no response): fetch failed');
});

test('preserves the request error when there is no server errorMessage', () => {
  const error = new EngineRequestError('GET', 'http://localhost:8080/api/version', {
    status: 502,
    statusText: 'Bad Gateway',
    data: '<html>Bad gateway</html>'
  });
  expect(() => handleEngineError(error)).toThrow(error);
  expect(logErrorMessage).toHaveBeenCalledWith(
    'Request failed: GET http://localhost:8080/api/version (502 Bad Gateway): Request failed with status code 502'
  );
});

test('can suppress logging while still throwing the server error', () => {
  const error = new EngineRequestError('POST', 'http://localhost:8080/import', {
    status: 400,
    statusText: 'Bad Request',
    data: { errorMessage: 'Invalid archive' }
  });
  expect(() => handleEngineError(error, false)).toThrow('Invalid archive');
  expect(logErrorMessage).not.toHaveBeenCalled();
});

test('rethrows unrelated errors unchanged', () => {
  const error = new Error('Unexpected failure');
  expect(() => handleEngineError(error)).toThrow(error);
  expect(logErrorMessage).not.toHaveBeenCalled();
});

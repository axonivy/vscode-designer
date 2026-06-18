import { URL } from 'url';

export const toWebSocketUrl = (engineUrl: string) => {
  const url = new URL(engineUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url;
};

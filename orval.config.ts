import { defineConfig } from 'orval';

const marketFetch = {
  mutator: {
    path: 'extension/src/market/market-fetch.ts',
    name: 'marketFetch'
  }
};

export default defineConfig({
  ivyOpenApi: {
    input: {
      target: 'target/engine/openapi.json',
      filters: { tags: ['web-ide'] }
    },
    output: {
      target: 'extension/src/engine/api/generated/client.ts',
      formatter: 'prettier'
    }
  },
  openapiMarket: {
    input: {
      target: 'target/market/openapi.json',
      filters: { tags: ['Product Controller', 'Product Detail Controllers'] }
    },
    output: {
      target: 'extension/src/market/generated/market-client.ts',
      formatter: 'prettier',
      client: 'fetch',
      override: marketFetch
    }
  }
});

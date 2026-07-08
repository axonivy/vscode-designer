[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/axonivy/vscode-designer)

# VS Code extension

The available VS Code extension can be found under `/extension`.

## Build & Package

- `pnpm install`: install all packages
- `pnpm run build`: build the extension and webviews
- `pnpm run engine:download`: download and unpack the latest master engine
- `pnpm run package`: package the extension as .vsix file

### Generate REST Client from Axon Ivy OpenAPI

To access the REST API of the engine and the market, we generate the Axios client from OpenAPI. To retreive the current OpenAPI specifications, you can run the following command (Maven needed):

```shellscript
pnpm run openapi
```

This will run `"openapi:download"` and `"openapi:codegen"`, which will download the most recent OpenAPI specification with and generate the Axios client under `extension/src/engine/api/generated` and `extension/src/market/api/generated`.
The OpenAPI specifications generated are from the last successful build of a releasing branch. You can also load the file from https://jenkins.ivyteam.io/job/core_openapi/.

If you're working on a feature branch and want to generate the clients from a manually generated OpenAPI specification, you can

- download the OpenAPI specification from the engine and place it under `target/engine/openapi.json` and then run:
- `pnpm run openapi:codegen`

## Debugging the extension

Make sure that:

- all packages are installed, i.e. run `pnpm install`
- webviews are built, i.e. run `pnpm build`

Then simply start the `Run Extension` launch config, which will also activate the watch mode for the extension. If you want to watch webviews, manually run the watch script for the webview you want to watch.

## Connect to another Ivy Engine

If you do not want to use the embedded engine as backend, you can define an alternative under `VS Code Settings / Axon Ivy`. Simply uncheck `Engine: Run By Extension` and set `Engine: Url` you want to use.

## MCP setup for third-party harness

You can expose the extension AI tools through an MCP
and connect your favorite AI harness to that local endpoint.

We tested this with Claude and Copilot CLI, but it should work with other vendors as well.
For MCP setup instructions, see [mcp.md](doc/mcp/mcp.md).

## Integration Tests

Playwright tests can be executed against VSCode Insiders.
Make sure that an Engine is running on localhost:8080. It will be used as the backend for testing.

- `pnpm run test:playwright:download:vscode`: download latest VSCode Insiders
- `pnpm run test:playwright`: run all tests against electron app

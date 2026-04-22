[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/axonivy/vscode-designer)

# VS Code extension

The available VS Code extension can be found under `/extension`.

## Build & Package

- `pnpm install`: install all packages
- `pnpm run build`: build the extension and webviews
- `pnpm run engine:download`: download and unpack the latest master engine
- `pnpm run package`: package the extension as .vsix file

### Generate REST Client from Axon Ivy OpenAPI

To access the REST API of the engine, we generate the Axios client from OpenAPI. For the creation, it is expected that the OpenAPI specification is located under `target/engine/openapi.json`. The easiest way to retrieve the specification is to run the following command (Maven needed). Otherwise, you can load the file from https://jenkins.ivyteam.io/job/core_openapi/

```shellscript
pnpm run openapi
```

## Debugging the extension

Make sure that:

- all packages are installed, i.e. run `pnpm install`
- webviews are built, i.e. run `pnpm build`

Then simply start the `Run Extension` launch config, which will also activate the watch mode for the extension. If you want to watch webviews, manually run the watch script for the webview you want to watch.

## Connect to another Ivy Engine

If you do not want to use the embedded engine as backend, you can define an alternative under `VS Code Settings / Axon Ivy`. Simply uncheck `Engine: Run By Extension` and set `Engine: Url` you want to use.

## Integration Tests

Playwright tests can be executed against VSCode Insiders.
Make sure that an Engine is running on localhost:8080. It will be used as the backend for testing.

- `pnpm run test:playwright:download:vscode`: download latest VSCode Insiders
- `pnpm run test:playwright`: run all tests against electron app

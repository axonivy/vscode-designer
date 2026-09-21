# Rest Client Chat Context

This extension contains an experimental integration for VS Code's proposed
`chatContextProvider` API. It makes the YAML backing an open
`ivy.restClientEditor` tab available as implicit Agent Chat context.

## Trying the prototype

The extension targets VS Code `1.136.1` or newer and must run in an Insiders
build that contains the proposal. Launch the Extension Development Host with
the extension enabled for proposed APIs:

```sh
code-insiders --enable-proposed-api=axonivy.vscode-designer-14
```

The exact extension identifier is shown by the Extension Development Host if
the launcher uses a different identifier.

When the proposal is unavailable, registration is skipped and the extension
continues to provide its normal functionality.

## Upstream tracking

The canonical discussion is [VS Code issue #271104: Support contributable chat
context resources](https://github.com/microsoft/vscode/issues/271104). The
implementation was developed in these merged pull requests:

- [#273736](https://github.com/microsoft/vscode/pull/273736)
- [#278135](https://github.com/microsoft/vscode/pull/278135)
- [#288084](https://github.com/microsoft/vscode/pull/288084)
- [#292295](https://github.com/microsoft/vscode/pull/292295)

Merged implementation work does not by itself make the API stable. The issue
and the VS Code release notes remain the authoritative sources for its status.

## When the API becomes stable

Treat the API as stable only when all of the following are true:

- `registerChatTabContextProvider` is present in the released stable
  `vscode.d.ts`, not only in `vscode.proposed.chatContextProvider.d.ts`.
- `chatContextProvider` is no longer listed in VS Code's API proposal catalog.
- The matching stable `@types/vscode` package exposes the API without a local
  declaration or `enabledApiProposals` entry.
- The provider registers successfully in a stable VS Code build without
  `--enable-proposed-api`.

Keep the provider behavior, then remove the `enabledApiProposals` manifest
entry, the local proposed declaration, and the runtime availability guard once
the API is part of the stable `vscode` typings. Recheck the API name and
provider contract against the finalized declaration before publishing.

The provider reads the backing document through the custom tab's URI. The
context reflects the current VS Code `TextDocument`; webview-only state that
has not been written to that document is not independently serialized.

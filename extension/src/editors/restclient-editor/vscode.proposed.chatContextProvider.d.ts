declare module 'vscode' {
  export interface ChatContextItem {
    label?: string;
    resourceUri?: Uri;
    modelDescription?: string;
    value?: string;
  }

  export interface ChatTabContextProvider<T extends ChatContextItem = ChatContextItem> {
    provideChatTabContext(options: { tab: Tab }, token: CancellationToken): ProviderResult<T | undefined>;
    resolveChatTabContext(context: T, token: CancellationToken): ProviderResult<ChatContextItem>;
  }

  export namespace chat {
    export function registerChatTabContextProvider(
      selector: { viewType: string },
      id: string,
      provider: ChatTabContextProvider
    ): Disposable;
  }
}

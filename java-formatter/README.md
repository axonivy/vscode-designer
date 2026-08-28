# Java Formatter for VS Code

This repository contains the `ivyteam` Eclipse formatter profile exported from the core repository. It works with the [Extension Pack for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack), which includes the `redhat.java` language support extension.

To configure it:

1. Run `Preferences: Open User Settings (JSON)` from the Command Palette.
2. Add the following settings to `settings.json`, merging them with any existing settings:

```json
{
  "java.format.settings.url": "https://raw.githubusercontent.com/axonivy/vscode-designer/refs/heads/master/java-formatter/eclipse-formatter.xml",
  "java.format.settings.profile": "ivyteam",
  "[java]": {
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  }
}
```

The formatter is applied automatically when saving Java files. You can also run `Format Document` from the Command Palette.

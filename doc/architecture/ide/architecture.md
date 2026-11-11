# VSCode Designer

## Integration

```mermaid
flowchart LR
    subgraph Designer[📐️Designer]
      subgraph Editors[🧑‍💻️Editor<br/>webviews]
        process
        form
        role
        x.editor[...]
        monaco[🏎️monaco]
      end
      subgraph commands[⚡️commands]
        deploy
        install
        x.command[...]
      end
      subgraph chat[💬️chat]
        mcp
        skills
      end
      workspace
    end
    mcp --> commands

    subgraph Engine[🥇Engine]
      subgraph dev[🏗️ dev]
        subgraph LSPs[Editor<br/>ws://]
          process.lsp[proess]
          form.lsp[form]
          role.lsp[role]
          x.lsp[...]
        end
        web.ide
      end
      runtime[▶️runtime]
      subgraph config[⚙️config]
        process.mode[process]
        form.model[form]
        role.model[role]
        x.model[...]
      end
      web.ide --> runtime
    end

    schemas[(📃️ json-schem<br/>.axonivy.com)]
    config-->schemas
    dev-->config

    market[(🛍️ market<br/>.axonivy.com)]
    maven[(maven<br/>.axonivy.com)]
    market --> maven

    java[java<br/>vsx.extension]
    Editors --[lsp]--> java

    gh-axonivy[(github<br/>/axonivy)]
    gh-axonivy --[integrate]-->Editors

    gh-market[(github<br/>/axonivy-market)]
    gh-market --> maven

    Editors --[JSON/RPC<br/>(OpenRPC)]--> LSPs
    commands --[REST<br/>(OpenAPI)]--> web.ide
    commands --[REST<br/>(OpenAPI)]--> market
    commands --[https]--> maven
    skills-->schemas

```


Editor-WS capabilities
- IO
- Validate
- Meta

References
- [Editor Repos](https://github.com/axonivy?q=editor&type=all&language=&sort=)
- [Schemas](https://json-schema.axonivy.com)
- [Market](https://market.axonivy.com)


Project Lifecycle

```mermaid
flowchart LR
Workspace --[files]--> IvyProject
IvyProject --[build]--> IAR
IAR --[deploy]--> Engine
```
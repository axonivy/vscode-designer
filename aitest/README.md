# AI Tests

Tests the native tools and skills of the vscode-designer.
The focus is one asserting the effectiveness of a real-world prompt.

## Docker

We use test-containers to run the complete environment in Docker.

- **Designer-MCP**: runs VSCode and the vscode-designer extension with an MCP enabled.
- **Copilot**: runs copilot CLI with the designer MCP enabled.
- **Aspire**: runs the opentelemetry compatible Aspire dashboard to trace the copilot execution. The collected spans are asserted to verify copilot behavior.

The containers are kept running, after test-execution, to allow fast development cycles.

## Test Env

In order to run the tests on your local machine,
these environment variables need to be set:

```bash
# linux example
JAVA_HOME=/usr/lib/jvm/temurin-25-jdk-amd64/
HOST_UID=$(id -u)
HOST_GID=$(id -g)
COPILOT_TOKEN=github_pat_xyz...
```

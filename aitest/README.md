# AI Tests

Tests the native tools and skills of the vscode-designer.
The focus is on asserting the effectiveness of a real-world prompt.

## Docker

We use test-containers to run the complete environment in Docker.

- **Designer-MCP**: runs VSCode and the vscode-designer extension with an MCP enabled.
- **Copilot**: runs copilot CLI with the designer MCP enabled.
- **Aspire**: runs the opentelemetry compatible Aspire dashboard to trace the copilot execution. The collected spans are asserted to verify copilot behavior.

The containers are kept running after test execution to allow fast development cycles. Container reuse requires two settings:

1. **Project level (enabled by default for local development)**:
   Controlled via the `TESTCONTAINERS_REUSE_ENABLE` environment variable (defaults to `true` locally, set to `false` in CI).
   ```bash
   export TESTCONTAINERS_REUSE_ENABLE=true
   ```

2. **Global level (user machine configuration)**:
   Testcontainers requires container reuse to be explicitly enabled in your user home config (`~/.testcontainers.properties`), otherwise Ryuk will clean up the containers when the test process finishes:
   ```bash
   echo "testcontainers.reuse.enable=true" >> ~/.testcontainers.properties
   ```

## Test Env

In order to run the tests on your local machine,
these environment variables need to be set:

```bash
# linux example
export JAVA_HOME=/usr/lib/jvm/temurin-25-jdk-amd64/
export HOST_UID=$(id -u)
export HOST_GID=$(id -g)
export COPILOT_TOKEN=github_pat_xyz...
```

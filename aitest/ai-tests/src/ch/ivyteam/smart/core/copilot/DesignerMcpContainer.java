package ch.ivyteam.smart.core.copilot;

import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

public class DesignerMcpContainer extends GenericContainer<DesignerMcpContainer> {

  public static final String NETWORK_ALIAS = "designer-mcp";
  public static final int MCP_PORT = 32140;

  public DesignerMcpContainer(String workspaceRoot, String javaHome) {
    super(DockerImageName.parse("mcr.microsoft.com/playwright:v1.54.2-noble"));

    if (javaHome == null || javaHome.isBlank()) {
      throw new IllegalStateException("JAVA_HOME must be set to run designer-mcp container");
    }

    withWorkingDirectory("/workspace");
    withFileSystemBind(workspaceRoot, "/workspace", BindMode.READ_WRITE);
    withFileSystemBind(javaHome, javaHome, BindMode.READ_ONLY);
    withEnv("JAVA_HOME", javaHome);
    withExposedPorts(MCP_PORT);
    withCommand(
        "bash", "-lc",
        "set -euo pipefail\n"
            + "./.github/workflows/mcp.sh vscode-designer.code-workspace\n"
            + "exec tail -f /dev/null");
  }
}
package ch.ivyteam.smart.core.copilot;


import java.io.IOException;

import org.testcontainers.images.builder.Transferable;

public class Copilot {

  private final CopilotContainer container;
  private String configuredMcpUrl;

  public Copilot(CopilotContainer container) {
    this.container = container;
  }

  public void prompt(String prompt, String testName) throws InterruptedException, IOException {
    var containerWorkspace = "/workspace";
    var result = container.execInContainer(
        "sh", "-c", ""
            + "cd \"$0\" && "
            + "OTEL_SERVICE_NAME=\"$1\" "
            + "copilot -p \"$2\" "
            + "--no-ask-user --yolo --allow-all-mcp-server-instructions --log-dir /user-data -s",
        containerWorkspace, testName, prompt);
    if (result.getExitCode() != 0) {
      throw new RuntimeException("Copilot command failed: " + result.getStderr());
    }
  }

  public void addMcp(String designerMcp) {
    this.configuredMcpUrl = designerMcp;
    String mcp = smartCoreMcpServerConfig(designerMcp);
    System.out.println("Adding MCP config to Copilot container: " + mcp);
    try {
      container.execInContainer("mkdir", "-p", "/root/.copilot/");
    } catch (Exception e) {
      throw new RuntimeException("Failed to create Copilot MCP config directory", e);
    }
    container.copyFileToContainer(
        Transferable.of(mcp),
        "/root/.copilot/mcp-config.json");
    System.out.println("copilot container: "+ container.getContainerId());
  }

  public void otlpEndpoint(String endpoint) {
    container.withEnv("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint);
  }

  private static String smartCoreMcpServerConfig(String smartCoreMcpUrl) {
    return String.format("""
      {
        "mcpServers": {
          "axonivy-designer": {
            "type": "http",
            "url": "%s",
            "tools": [ "*" ]
          }
        }
      }""",
        smartCoreMcpUrl);
  }

  public String listMcp() {
    try {
      var listResult = container.execInContainer("sh", "-c", "copilot mcp list --json");
      if (listResult.getExitCode() != 0) {
        throw new RuntimeException("Copilot MCP list command failed: " + listResult.getStderr());
      }
      return listResult.getStdout();
    } catch (Exception e) {
      throw new RuntimeException("Failed to list MCP servers in Copilot container", e);
    }
  }

  public int mcpHealth() {
    try{
      var endpointResult = container.execInContainer("sh", "-c",
          "if command -v curl >/dev/null 2>&1; then "
              + "curl -sS -o /dev/null -w '%{http_code}' \"$0\"; "
              + "else echo 'curl-not-installed'; fi",
          configuredMcpUrl.replace("/mcp", "/health"));
      return Integer.parseInt(endpointResult.getStdout());
    } catch (Exception e) {
      throw new RuntimeException("Failed to check MCP health in Copilot container", e);
    }
  }

}

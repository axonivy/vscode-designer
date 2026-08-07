package ch.ivyteam.smart.core.copilot;


import java.io.IOException;
import java.util.UUID;

import org.testcontainers.images.builder.Transferable;

public class Copilot {

  private final CopilotContainer container;
  private String configuredMcpUrl;

  public Copilot(CopilotContainer container) {
    this.container = container;
  }

  public String prompt(String prompt) throws InterruptedException, IOException {
    var resource = "copilot-cli-" + UUID.randomUUID();
    var containerWorkspace = "/" + resource;

    var result = container.execInContainer(
        "sh", "-c",
        "mkdir \"$0\" && "
            + "cd \"$0\" && "
            + "OTEL_SERVICE_NAME=\"$1\" "
            + "copilot -p \"$2\" "
            + "--no-ask-user --allow-all-tools -s",
        containerWorkspace, resource, prompt);
    if (result.getExitCode() != 0) {
      throw new RuntimeException("Copilot command failed: " + result.getStderr());
    }

    return resource;
  }

  public void addMcp(String smartCoreMcpUrl) {
    configuredMcpUrl = normalizeMcpUrl(smartCoreMcpUrl);
    String mcp = smartCoreMcpServerConfig(configuredMcpUrl);
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

  private static String normalizeMcpUrl(String smartCoreMcpUrl) {
    // On Linux, use the Docker bridge gateway; on Docker Desktop, host-gateway works via extra host mapping
    String hostIp = "host.docker.internal";
    smartCoreMcpUrl = smartCoreMcpUrl.replace("localhost", hostIp);
    // keep IP URI -> fallback for local dev exec.
    return smartCoreMcpUrl.replace("127.0.0.1", hostIp);
  }

  public void mcpCheck() {
    try {
      var listResult = container.execInContainer("sh", "-c", "copilot mcp list");
      System.out.println("MCP list exit=" + listResult.getExitCode());
      System.out.println("MCP list stdout: " + listResult.getStdout());
      System.out.println("MCP list stderr: " + listResult.getStderr());

      var getResult = container.execInContainer("sh", "-c", "copilot mcp get axonivy-designer");
      System.out.println("MCP get exit=" + getResult.getExitCode());
      System.out.println("MCP get stdout: " + getResult.getStdout());
      System.out.println("MCP get stderr: " + getResult.getStderr());

      if (configuredMcpUrl != null && !configuredMcpUrl.isBlank()) {
        var endpointResult = container.execInContainer("sh", "-c",
            "if command -v curl >/dev/null 2>&1; then "
                + "curl -sS -o /dev/null -w '%{http_code}' \"$0\"; "
                + "else echo 'curl-not-installed'; fi",
            configuredMcpUrl);
        System.out.println("MCP endpoint probe exit=" + endpointResult.getExitCode());
        System.out.println("MCP endpoint probe: " + endpointResult.getStdout());
        System.out.println("MCP endpoint probe stderr: " + endpointResult.getStderr());
      }
    } catch (Exception e) {
      throw new RuntimeException("MCP check failed", e);
    }
  }

  public String promptWithRequiredMcpTool(String prompt) throws InterruptedException, IOException {
    String forcedPrompt = "You must call at least one MCP tool from the 'axonivy-designer' server before answering. "
        + "If tool invocation fails, explain the exact failure. User request: " + prompt;
    return prompt(forcedPrompt);
  }

}

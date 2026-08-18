package ch.ivyteam.smart.core.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;

import ch.ivyteam.smart.core.AgentRuntime;

public class CopilotIntegrationTest {

  private static AgentRuntime rt = new AgentRuntime();

  @BeforeAll
  public static void beforeAll() {
    rt.start();
  }


  @AfterAll
  public static void afterAll() {
    rt.stop();
  }

  @Test
  void createProject(TestInfo testInfo) throws Exception {
    var resourceName = testInfo.getTestMethod().orElseThrow().getName();
    rt.copilot().prompt("create an axon ivy project for a flight-simulator", resourceName);
    var spans = rt.aspire().spansOfResource(resourceName);
    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(150_000);
    assertThat(tokenUsage.output()).isLessThan(10_000);

    var flightSimulator = rt.ivyWorkspace().path().resolve("flight-simulator");
    assertThat(flightSimulator)
      .as("project created in workspace")
      .exists();
    assertThat(rt.ivyEngine().ivyLog())
      .as("no-errors in log")
      .isEmpty();
  }

  @Test
  void mcpON() throws Exception {
    assertThat(rt.copilot().listMcp())
      .as("MCP is configured for Copilot user")
      .contains(
        "\"type\": \"http\"",
        "\"url\": \"http://designer-mcp:32140/mcp\"");
    assertThat(rt.copilot().mcpHealth())
      .as("MCP answers health with 200 OK")
      .isEqualTo(200);

    rt.copilot().prompt("name all available tools from current MCP setup", "mcp-tools");
    var spans = rt.aspire().spansOfResource("mcp-tools");

    assertThat(spans.tools().names())
      .as("tools from vscode-designer MCP are propagated to harness")
      .contains("axonivy-designer-new_axon_ivy_project");

    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(150_000);
    assertThat(tokenUsage.output()).isLessThan(10_000);
  }
}

package ch.ivyteam.smart.core.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import ch.ivyteam.smart.core.Runtime;

public class CopilotIntegrationTest {

  private static Runtime rt = new Runtime();

  @BeforeAll
  public static void beforeAll() {
    rt.start();
  }


  @AfterAll
  public static void afterAll() {
    rt.stop();
  }

  @Test
  void createProject() throws Exception {
    rt.copilot().prompt("create an axon ivy project for a flight-simulator", "create-project");
    var spans = rt.aspire().spansOfResource("create-project");
    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(150_000);
    assertThat(tokenUsage.output()).isLessThan(10_000);
  }

  @Test
  void mcpON() throws Exception {
    rt.copilot().mcpCheck();
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

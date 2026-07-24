package ch.ivyteam.smart.core.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import ch.ivyteam.smart.core.Runtime;
import ch.ivyteam.smart.core.telemetry.TelemetryUtils;

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
    var resource = rt.copilot().prompt("create an axon ivy project for a flight-simulator");
    // contains: axonivy-designer-new_axon_ivy_project
    var spans = rt.aspire().spansOfResource(resource);
    System.out.println("Spans of resource " + resource + ": " + spans.toPrettyString());
    
    var first = spans.get(0);    
    var attrs = first.get("attributes");
    var tools = attrs.properties().stream()
      .filter(e -> e.getKey().endsWith("gen_ai.tool.definitions"))
      .map(e -> e.getValue())
      .findFirst().orElseThrow();
    assertThat(tools.toPrettyString())
      .contains("new_axon_ivy_project");

    var tokenUsage = TelemetryUtils.tokenUsage(spans);
    assertThat(tokenUsage.input()).isLessThan(150000);
    assertThat(tokenUsage.output()).isLessThan(10000);
  }

  @Test
  void mcpON() throws Exception {
    var resource = rt.copilot().prompt("name all available tools from current MCP setup");
    var spans = rt.aspire().spansOfResource(resource);
    var tokenUsage = TelemetryUtils.tokenUsage(spans);
    assertThat(tokenUsage.input()).isLessThan(150000);
    assertThat(tokenUsage.output()).isLessThan(10000);
  }
}

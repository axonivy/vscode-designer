package ch.ivyteam.smart.core.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;

import ch.ivyteam.smart.core.AgentRuntime;
import ch.ivyteam.smart.core.AgentRuntimeExtension;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ExtendWith(AgentRuntimeExtension.class)
public class CopilotIntegrationTest {

  @Test
  @Order(3)
  void createProject(AgentRuntime rt, TestInfo testInfo) throws Exception {
    var resourceName = testInfo.getTestMethod().orElseThrow().getName();
    rt.copilot().prompt("create an axon ivy project for a flight-simulator", resourceName);
    var spans = rt.aspire().spansOfResource(resourceName);
    rt.reporter().report(testInfo, spans);
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
    assertThat(spans.usedTools())
        .as("new_axon_ivy_project tool was used")
        .extracting(UsedTool::name)
        .contains("axonivy-designer-new_axon_ivy_project");
  }

  @Test
  @Order(2)
  void mcpON(AgentRuntime rt, TestInfo testInfo) throws Exception {
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
    rt.reporter().report(testInfo, spans);

    assertThat(spans.tools().names())
        .as("tools from vscode-designer MCP are propagated to harness")
        .contains("axonivy-designer-new_axon_ivy_project");

    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(150_000);
    assertThat(tokenUsage.output()).isLessThan(10_000);
  }

  @Test
  @Order(1) // before: createProject (let's fetch the schemas here for the first time)
  void initEditRolesYaml(AgentRuntime rt, TestInfo testInfo) throws Exception {
    var resourceName = testInfo.getTestMethod().orElseThrow().getName();
    rt.copilot().prompt("create the roles: manager and employee in purchase/config/roles.yaml", resourceName);
    var spans = rt.aspire().spansOfResource(resourceName);
    rt.reporter().report(testInfo, spans);

    var roles = rt.ivyWorkspace().path().resolve("purchase/config/roles.yaml");
    assertThat(roles).content()
        .as("Id: field name is known by reading roles.yaml schema")
        .contains("Id: manager", "Id: employee");
    assertThat(roles).content()
        .as("no tabs in roles.yaml: happens in vscode copilot quite often")
        .doesNotContain("\t");

    assertThat(spans.usedTools())
        .extracting(UsedTool::name)
        .contains("skill", "web_fetch");

    var skillTool = spans.usedTools().stream().filter(t -> t.name().equals("skill")).findFirst().orElseThrow();
    assertThat(skillTool.arguments()).contains("yaml-files");

    var webFetch = spans.usedTools().stream().filter(t -> t.name().equals("web_fetch")).findFirst().orElseThrow();
    assertThat(webFetch.arguments())
        .contains("https://json-schema.axonivy.com")
        .contains("config/roles.json");

    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(200_000); // around: 170_000 in local tests
    assertThat(tokenUsage.output()).isLessThan(10_000);
  }

}

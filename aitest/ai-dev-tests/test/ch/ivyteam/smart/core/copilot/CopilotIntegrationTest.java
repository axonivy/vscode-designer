package ch.ivyteam.smart.core.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.Objects;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import ch.ivyteam.smart.core.AgentRuntime;
import ch.ivyteam.smart.core.AgentRuntimeExtension;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.StringNode;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ExtendWith(AgentRuntimeExtension.class)
public class CopilotIntegrationTest {

  @Test
  @Order(3)
  void createProject(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("create an axon ivy project for a flight-simulator");
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
  void mcpON(AgentRuntime rt) throws Exception {
    assertThat(rt.copilot().listMcp())
        .as("MCP is configured for Copilot user")
        .contains(
            "\"type\": \"http\"",
            "\"url\": \"http://designer-mcp:32140/mcp\"");
    assertThat(rt.copilot().mcpHealth())
        .as("MCP answers health with 200 OK")
        .isEqualTo(200);

    var spans = rt.prompt("name all available tools from current MCP setup");

    assertThat(spans.tools().names())
        .as("tools from vscode-designer MCP are propagated to harness")
        .contains("axonivy-designer-new_axon_ivy_project");

    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(150_000);
    assertThat(tokenUsage.output()).isLessThan(10_000);
  }

  @Test
  @Order(1) // before: createProject (let's fetch the schemas here for the first time)
  void initEditRolesYaml(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("create the roles: manager and employee in purchase/config/roles.yaml");

    var roles = rt.ivyWorkspace().path().resolve("purchase/config/roles.yaml");
    assertThat(roles).content()
        .as("Id: field name is known by reading roles.yaml schema")
        .contains("Id: manager", "Id: employee");
    assertThat(roles).content()
        .as("no tabs in roles.yaml: happens in vscode copilot quite often")
        .doesNotContain("\t");

    assertThat(spans.usedTools())
        .extracting(UsedTool::name)
        .contains("skill")
        .doesNotContain("web_fetch"); // skill cache!

    var skillTool = spans.usedTools().stream().filter(t -> t.name().equals("skill")).findFirst().orElseThrow();
    assertThat(skillTool.arguments()).contains("ivy-yaml-files");

    var viewSchema = spans.usedTools().stream()
        .filter(t -> t.name().equals("view"))
        .filter(t -> t.arguments().contains("skills/ivy-yaml-files/schemas/"))
        .findFirst().orElseThrow();
    assertThat(viewSchema.arguments())
        .as("schema read was enforced by skill")
        .contains("config/roles.json");

    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isLessThan(200_000); // around: 170_000 in local tests
    assertThat(tokenUsage.output()).isLessThan(10_000);
  }

  @Test
  @Order(1)
  void process(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        create a new process for 'treePlanting' (purchase/process/treePlanting.p.json).
        The start must accept a 'name' parameter.
        After the start, a Script activity should print a 'Hello Ivy in.name!' log.
        """);

    var plantProcess = rt.ivyWorkspace().path().resolve("purchase/process/treePlanting.p.json");
    try (var in = Files.newInputStream(plantProcess, StandardOpenOption.READ)) {
      var procJson = JsonMapper.shared().readTree(in);

      assertThat(procJson.get("$schema").asString())
          .as("valid $schema was set by new_process_tool")
          .startsWith("https://json-schema.axonivy.com/");

      var elements = (ArrayNode) procJson.get("elements");
      var script = elements.valueStream()
          .filter(e -> e.get("type") instanceof StringNode type && Objects.equals(type.asString(), "Script"))
          .findFirst().orElseThrow(() -> new IllegalStateException("Script activity not found in " + procJson.toPrettyString()));
      assertThat(script.get("config").get("output").get("code").toPrettyString())
          .as("Script Activity is configured schema-aware")
          .contains("Hello Ivy");
    }

    assertThat(spans.usedTools())
        .extracting(UsedTool::name)
        .as("Must use create-tool for initial correct creation; then web_fetch to get aware of the schema")
        .contains("skill", "axonivy-designer-new_axon_ivy_process")
        .doesNotContain("web_fetch"); // skill cache!

    var viewSchema = spans.usedTools().stream()
        .filter(t -> t.name().equals("view"))
        .filter(t -> t.arguments().contains("skills/ivy-json-files/schemas/"))
        .findFirst().orElseThrow();
    assertThat(viewSchema.arguments())
        .as("schema read was enforced by skill")
        .contains("project/process.json");
  }

}

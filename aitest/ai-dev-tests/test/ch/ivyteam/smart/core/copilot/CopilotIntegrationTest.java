package ch.ivyteam.smart.core.copilot;

import static ch.ivyteam.smart.core.assertion.AspireSpansAssert.assertThat;
import static org.assertj.core.api.Assertions.assertThat;
import static ch.ivyteam.smart.core.copilot.AiUtils.findFile;
import static ch.ivyteam.smart.core.copilot.AiUtils.readJson;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import ch.ivyteam.smart.core.AgentRuntime;
import ch.ivyteam.smart.core.AgentRuntimeExtension;
import tools.jackson.databind.JsonNode;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ExtendWith(AgentRuntimeExtension.class)
public class CopilotIntegrationTest {

  @Test
  @Order(Complexity.HEAVY)
  void createProject(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("create a new Axon Ivy project called flight-simulator");
    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_project")
        .usedTokensBelow(150_000, 10_000);

    var flightSimulator = rt.ivyWorkspace().path().resolve("flight-simulator");
    assertThat(flightSimulator)
        .as("project created in workspace")
        .exists();
    assertThat(rt.ivyEngine().newLogs())
        .as("no-errors in log")
        .isEmpty();
  }

  @Test
  @Order(Complexity.INDEPENDENT)
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
        .contains(
            "axonivy-designer-new_axon_ivy_project",
            "axonivy-designer-import_market_product");
    assertThat(spans).usedTokensBelow(150_000, 10_000);
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void process(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        create a new process for 'treePlanting' in 'purchase' project.
        The start must accept a 'name' parameter.
        After the start, a Script activity should print a 'Hello Ivy in.name!' log.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var processDir = purchase.resolve("process");
    var plantProcess = findFile(processDir, "treePlanting.p.json");
    var procJson = readJson(plantProcess);
    assertThat(procJson.get("$schema").asString())
        .as("valid $schema was set by new_process_tool")
        .startsWith("https://json-schema.axonivy.com/");

    var dataClass = procJson.path("config").path("data").asString().replace('.', '/');
    var dataJson = readJson(purchase.resolve("dataclass/" + dataClass + ".d.json"));
    assertThat(dataJson.path("fields").valueStream().map(f -> f.path("name").asString()))
        .as("mapped attribute 'out.name' exists in data class: %s", dataJson.toPrettyString())
        .contains("name");

    var start = procElement(procJson, "RequestStart");
    var input = start.path("config").path("input");
    assertThat(input.path("params").valueStream().map(p -> p.path("name").asString()))
        .as("start declares the 'name' parameter: %s", start.toPrettyString())
        .contains("name");
    assertThat(input.path("map").path("out.name").asString())
        .as("start maps the parameter into process data: %s", start.toPrettyString())
        .isEqualTo("param.name");

    var script = procElement(procJson, "Script");
    assertThat(script.get("config").get("output").get("code").toPrettyString())
        .as("Script Activity is configured schema-aware")
        .contains("ivy.log.", "Hello Ivy", "in.name");

    assertThat(spans)
        .as("Must use create-tool for initial correct creation; then the skill's local schema, not web_fetch")
        .usedTools("skill", "axonivy-designer-new_axon_ivy_process")
        .viewed("skills/ivy-json-files/schemas/project/process.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  private static JsonNode procElement(JsonNode process, String type) {
    return process.path("elements").valueStream()
        .filter(e -> type.equals(e.path("type").asString()))
        .findFirst().orElseThrow(() -> new IllegalStateException(type + " not found in " + process.toPrettyString()));
  }

}

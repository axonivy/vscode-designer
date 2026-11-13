package ch.ivyteam.smart.core.copilot;

import static ch.ivyteam.smart.core.assertion.AspireSpansAssert.assertThat;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import ch.ivyteam.smart.core.AgentRuntime;
import ch.ivyteam.smart.core.AgentRuntimeExtension;
import ch.ivyteam.smart.core.copilot.PomParser.Dependency;

@ExtendWith(AgentRuntimeExtension.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class MarketTest {

  @Test
  @Order(Complexity.INDEPENDENT)
  void market_search(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("is there a built in facility to involve a JIRA instance in my process?");
    assertThat(spans)
        .as("fetches connectors from marketplace")
        .loadedSkill("ivy-market")
        .usedTools("web_fetch")
        .toolCallArguments("market.axonivy.com");

    var apiFetch = spans.usedTools().stream()
        .filter(u -> u.name().equals("web_fetch"))
        .filter(u -> u.arguments().contains("market.axonivy.com/stable/api/product"))
        .findFirst().orElseThrow();
    assertThat(apiFetch.result()).contains("adobe-acrobat");

    assertThat(spans.outputMessage())
        .containsIgnoringCase("Yes")
        .containsIgnoringCase("Jira");
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void market_install(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("install the JIRA connector from the marketplace");
    assertThat(spans)
        .loadedSkill("ivy-market")
        .usedTools("web_fetch")
        .didNotUseTools("axonivy-designer-import_ivy_project");

    var fetchCalls = spans.usedTools().stream().filter(tool -> tool.name().equals("web_fetch")).toList();
    assertThat(fetchCalls)
        .anySatisfy(call -> assertThat(call.arguments())
            .contains("https://market.axonivy.com/stable/api/product\""))
        .anySatisfy(call -> assertThat(call.arguments())
            .contains("https://market.axonivy.com/stable/api/product/jira-connector/install"));

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var pom = purchase.resolve("pom.xml");
    assertThat(PomParser.dependencies(pom))
        .as("Jira connector dependency added to pom.xml")
        .anySatisfy(dependency -> {
          assertThat(dependency.groupId()).isEqualTo("com.axonivy.connector.jira");
          assertThat(dependency.artifactId()).isEqualTo("jira-connector");
          assertThat(dependency.version()).isNotBlank();
          assertThat(dependency.type()).isEqualTo("iar");
        });
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void market_install_oneOf(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("install smart-workflow agent with anthropic.");
    assertThat(spans)
        .loadedSkill("ivy-market")
        .usedTools("web_fetch")
        .didNotUseTools("axonivy-designer-import_ivy_project");

    var apiCalls = spans.usedTools().stream().filter(call -> call.arguments() != null).toList();
    assertThat(apiCalls)
        .anyMatch(call -> call.arguments().contains("https://market.axonivy.com/stable/api/product\""));
    assertThat(apiCalls)
        .as("resolves the product version for the project's Ivy version")
        .anyMatch(call -> call.arguments().contains("/bestmatch?isShowDevVersion=true"));
    assertThat(apiCalls)
        .anyMatch(call -> call.arguments().contains("/product/smart-workflow/install?productVersion="));

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var pom = purchase.resolve("pom.xml");
    var deps = PomParser.dependencies(pom).stream()
        .filter(d -> d.groupId().equals("com.axonivy.utils.ai"))
        .toList();
    assertThat(deps).extracting(Dependency::artifactId)
        .containsOnly("smart-workflow", "smart-workflow-anthropic");
  }

  @Test
  @Order(Complexity.HEAVY)
  void market_install_import(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        Install the `connectivity-demos` from the marketplace into my workspace.
        """);
    assertThat(spans)
        .loadedSkill("ivy-market")
        .usedTools("axonivy-designer-import_market_product");

    var toolCalls = spans.usedTools();
    var apiCalls = toolCalls.stream().filter(call -> call.arguments() != null).toList();
    assertThat(apiCalls)
        .anyMatch(call -> call.arguments().contains("/product-details/connectivity-demo/"))
        .anyMatch(call -> call.arguments().contains("/product/connectivity-demo/install?productVersion="));

    var importCall = toolCalls.stream()
        .filter(call -> call.name().equals("axonivy-designer-import_market_product"))
        .findFirst().orElseThrow();
    assertThat(importCall.arguments())
        .contains("\"productId\":[\"connectivity-demos\"]")
        .contains("connectivity-demos")
        .doesNotContain("filePath", "targetPath");

    var workspace = rt.ivyWorkspace().path();
    var demo = workspace.resolve("connectivity-demos");
    assertThat(demo.resolve(".ivyproject"))
        .as("Market import result: %s; Copilot response: %s", importCall.result(), spans.outputMessage())
        .exists();
    assertThat(demo.resolve("pom.xml")).exists();
    assertThat(demo.resolve("process/soap/client/personClient.p.json")).exists();
    assertThat(demo.resolve("META-INF"))
        .as("Project was properly unwrapped from META-INF/ivy")
        .doesNotExist();
    assertThat(workspace.resolve("connectivity-demos-test"))
        .as("No other artifact from import-installer were imported.")
        .doesNotExist();

    var purchasePom = workspace.resolve("purchase/pom.xml");
    assertThat(PomParser.dependencies(purchasePom))
        .extracting(Dependency::artifactId)
        .as("Import install was added to workspace, not set as pom.xml dependency")
        .doesNotContain("connectivity-demos");
  }
}
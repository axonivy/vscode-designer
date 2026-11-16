package ch.ivyteam.smart.core.copilot;

import static ch.ivyteam.smart.core.assertion.AspireSpansAssert.assertThat;
import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import ch.ivyteam.smart.core.AgentRuntime;
import ch.ivyteam.smart.core.AgentRuntimeExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.dataformat.yaml.YAMLMapper;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ExtendWith(AgentRuntimeExtension.class)
public class ConfigurationTest {

  @Test
  @Order(Complexity.INDEPENDENT)
  void configureRoles(AgentRuntime rt) throws Exception {
    var spans = rt.prompt(
        "create the roles manager and employee in purchase/config/roles.yaml, plus a purchase manager that inherits from manager");

    var roles = rt.ivyWorkspace().path().resolve("purchase/config/roles.yaml");
    assertThat(roles).content()
        .as("Id: field name is known by reading roles.yaml schema")
        .containsIgnoringCase("Id: manager")
        .containsIgnoringCase("Id: employee");
    assertThat(roles).content()
        .as("no tabs in roles.yaml: happens in vscode copilot quite often")
        .doesNotContain("\t");

    var roleNodes = readYaml(roles).path("Roles");
    var roleIds = roleNodes.findValuesAsString("Id");
    assertThat(roleNodes.valueStream())
        .as("Parent: references the inherited role")
        .anySatisfy(role -> {
          assertThat(role.path("Id").asString()).matches("(?i)purchase.?managers?");
          assertThat(role.path("Parent").asString()).matches("(?i)managers?").isIn(roleIds);
        });

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/roles.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 10_000); // around: 170_000 in local tests
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void configureUsers(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("add two test users to the purchase project, an employee and a purchase manager");
    var config = rt.ivyWorkspace().path().resolve("purchase/config");

    var roleIds = readYaml(config.resolve("roles.yaml")).path("Roles").findValuesAsString("Id");
    var users = readYaml(config.resolve("users.yaml")).path("Users");
    assertThat(users.valueStream()).hasSizeGreaterThanOrEqualTo(2).allSatisfy(user -> {
      assertThat(user.propertyNames()).contains("Name", "Password");
      assertThat(user.path("Roles").valueStream().map(JsonNode::asString))
          .as("roles of test users are declared in roles.yaml")
          .isNotEmpty()
          .isSubsetOf(roleIds);
    });
    assertThat(config.resolve("users.yaml")).content().doesNotContain("\t");

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/users.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 2_000);
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void configureVariables(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        in purchase, the approval limit (5000) and the daily reminder time for approvers (07:30)
        should be configurable in the engine. also need a reminder template as .txt with some
        default text that admins can edit in the engine
        """);
    var config = rt.ivyWorkspace().path().resolve("purchase/config");

    var variablesYaml = Files.readString(config.resolve("variables.yaml"));
    assertThat(variablesYaml)
        .as("an approval limit defaults to 5000")
        .containsPattern("(?m)^\\h*[^#:\\r\\n]+:\\h*\"5000\"\\h*$");
    assertThat(variablesYaml)
        .as("a daytime variable defaults to 07:30")
        .containsPattern("(?m)^\\h*#\\h*\\[daytime\\]\\R\\h*[^#:\\r\\n]+:\\h*\"07:30\"\\h*$");

    var template = Pattern
        .compile("(?im)^\\h*#\\h*\\[file: txt\\]\\R\\h*([^#:\\r\\n]*template[^#:\\r\\n]*):\\h*\"\"\\h*$")
        .matcher(variablesYaml);
    assertThat(template.find()).as("a template variable with file metadata and an empty value").isTrue();
    assertThat(findFile(config.resolve("variables"), template.group(1).strip() + ".txt")).content().isNotBlank();
    assertThat(variablesYaml).doesNotContain("\t");

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/variables.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 3_000);
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void configureCustomFields(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("add a supplier custom field to the tasks of the purchase project");
    var config = rt.ivyWorkspace().path().resolve("purchase/config");

    var tasks = readYaml(config.resolve("custom-fields.yaml")).path("CustomFields").path("Tasks");
    assertThat(tasks.propertyStream()).anySatisfy(field -> {
      assertThat(field.getKey()).containsIgnoringCase("supplier");
      assertThat(field.getValue().path("Type").asString()).matches("STRING|TEXT");
    });
    assertThat(config.resolve("custom-fields.yaml")).content().doesNotContain("\t");

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/custom-fields.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 2_500);
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void configureRestClient(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("purchase needs to fetch suppliers from https://api.acme.com/suppliers/v2, timeout 60s");
    var config = rt.ivyWorkspace().path().resolve("purchase/config");

    var restClient = assertThat(readYaml(config.resolve("rest-clients.yaml")).path("RestClients").propertyStream())
        .filteredOn(entry -> entry.getKey().matches("(?i).*supplier.*"))
        .first().satisfies(entry -> assertThat(entry.getKey()).matches("[A-Za-z0-9_-]+"))
        .actual().getValue();
    assertThat(restClient.at("/Url").asString()).isEqualTo("https://api.acme.com/suppliers/v2");
    assertThat(restClient.at("/Properties/jersey.config.client.readTimeout").asString()).isEqualTo("60000");
    // should have JsonFeature by default
    assertThat(restClient.at("/Features").valueStream().map(JsonNode::asString))
        .contains("ch.ivyteam.ivy.rest.client.mapper.JsonFeature");
    assertThat(config.resolve("rest-clients.yaml")).content().doesNotContain("\t");

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/rest-clients.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 2_000);
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void configureWebServiceClient(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        connect purchase to our ERP booking service. wsdl is https://erp.acme.com/booking?wsdl,
        BookingPort endpoint is https://erp.acme.com/booking/soap, and it has to go through proxy.acme.com:3128
        """);
    var config = rt.ivyWorkspace().path().resolve("purchase/config");

    var webServiceClient = assertThat(
        readYaml(config.resolve("webservice-clients.yaml")).path("WebServiceClients").propertyStream())
        .filteredOn(entry -> entry.getKey().matches("(?i).*(erp|booking).*"))
        .first().satisfies(entry -> assertThat(entry.getKey()).matches("[A-Za-z0-9_-]+"))
        .actual().getValue();
    assertThat(webServiceClient.at("/Codegen/WsdlUrl").asString()).isEqualTo("https://erp.acme.com/booking?wsdl");
    assertThat(webServiceClient.at("/Endpoints/BookingPort/0").asString())
        .isEqualTo("https://erp.acme.com/booking/soap");
    assertThat(webServiceClient.at("/Properties/proxy.host").asString()).isEqualTo("proxy.acme.com");
    assertThat(webServiceClient.at("/Properties/proxy.port").asString()).isEqualTo("3128");
    assertThat(webServiceClient.at("/Features").valueStream().map(JsonNode::asString))
        .contains("ch.ivyteam.ivy.webservice.exec.cxf.feature.ProxyFeature");
    assertThat(config.resolve("webservice-clients.yaml")).content().doesNotContain("\t");

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/webservice-clients.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 2_500);
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void configurePersistence(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        purchase should store its data in postgres: db purchase on db.acme.com, user purchase.
        the password gets set in the engine. let hibernate create and update the tables
        """);
    var config = rt.ivyWorkspace().path().resolve("purchase/config");

    var databaseEntries = readYaml(config.resolve("databases.yaml")).path("Databases");
    var units = readYaml(config.resolve("persistence.yaml")).path("Persistence");
    assertThat(units.valueStream()).anySatisfy(unit -> {
      assertThat(unit.at("/Properties/hibernate.hbm2ddl.auto").asString()).isEqualTo("update");
      var database = databaseEntries.path(unit.path("DataSource").asString());
      assertThat(database.path("Url").asString()).matches("jdbc:postgresql://db\\.acme\\.com(:5432)?/purchase");
      assertThat(database.path("Driver").asString()).isEqualTo("org.postgresql.Driver");
      assertThat(database.path("UserName").asString()).isEqualTo("purchase");
    });
    assertThat(config.resolve("databases.yaml")).content().doesNotContain("\t");
    assertThat(config.resolve("persistence.yaml")).content().doesNotContain("\t");

    assertThat(spans)
        .loadedSkill("ivy-yaml-files")
        .viewed("skills/ivy-yaml-files/schemas/config/databases.json",
            "skills/ivy-yaml-files/schemas/config/persistence.json")
        .didNotUseTools("web_fetch", "web_search")
        .usedTokensBelow(200_000, 4_000);
  }

  private static JsonNode readYaml(Path file) throws IOException {
    return YAMLMapper.shared().readTree(Files.readString(file));
  }

  private static Path findFile(Path dir, String fileName) throws IOException {
    try (var files = Files.walk(dir)) {
      return files.filter(f -> f.getFileName().toString().equals(fileName))
          .findFirst().orElseThrow(() -> new IllegalStateException(fileName + " not found in " + dir));
    }
  }
}
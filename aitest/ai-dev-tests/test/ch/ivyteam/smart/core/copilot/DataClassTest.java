package ch.ivyteam.smart.core.copilot;

import static ch.ivyteam.smart.core.assertion.AspireSpansAssert.assertThat;
import static org.assertj.core.api.Assertions.assertThat;
import static ch.ivyteam.smart.core.copilot.AiUtils.assertUserFields;
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
public class DataClassTest {

  @Test
  @Order(Complexity.INDEPENDENT)
  void dataClass(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        create a data class 'User' in the purchase project
        with the fields 'fullName', 'address', 'phone' (text) and 'age' (integer).
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var user = purchase.resolve("dataclass/com/acme/demo/User.d.json");
    assertThat(user).exists();
    assertUserFields(user);

    assertThat(spans)
        .usedTools("skill", "axonivy-designer-new_axon_ivy_data_class")
        .calledToolWithout("axonivy-designer-new_axon_ivy_data_class", "namespace") // model don't try to guess a
                                                                                    // namespace
        .viewed("skills/ivy-json-files/schemas/project/data-class.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void entityClass(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        create an entity class 'UserEntity' in the purchase project
        with the fields 'fullName', 'address', 'phone' (text) and 'age' (integer).
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var entity = purchase.resolve("dataclass/com/acme/demo/UserEntity.d.json");
    assertThat(entity).exists();
    assertUserFields(entity);

    var entityJson = readJson(entity);
    assertThat(entityJson.has("entity")).isTrue();
    var id = entityJson.path("fields").valueStream()
        .filter(f -> f.path("name").asString().equals("id"))
        .findFirst().orElseThrow(
            () -> new IllegalStateException("generated 'id' field was removed: " + entityJson.toPrettyString()));
    assertThat(id.path("modifiers").valueStream().map(JsonNode::asString)).contains("ID");

    assertThat(spans)
        .usedTools("skill", "axonivy-designer-new_axon_ivy_data_class")
        .calledToolWithout("axonivy-designer-new_axon_ivy_data_class", "namespace")
        .viewed("skills/ivy-json-files/schemas/project/data-class.json")
        .didNotUseTools("web_fetch", "web_search");
  }
}
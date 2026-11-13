package ch.ivyteam.smart.core.copilot;

import static ch.ivyteam.smart.core.assertion.AspireSpansAssert.assertThat;
import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import ch.ivyteam.smart.core.AgentRuntime;
import ch.ivyteam.smart.core.AgentRuntimeExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

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

  @Test
  @Order(Complexity.COMPOSITE)
  void formDialog(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        create a new dialog 'OrderForm' in 'purchase' project.
        The form lets the user enter an order: 'product' (text), 'quantity' (number) and 'deliveryDate' (date),
        and the 'customer' as the existing data class 'User' with all its fields.
        Each input is bound to the dialog data.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = purchase.resolve("dialog/com/acme/demo/OrderForm/OrderForm.f.json");
    assertThat(form)
        .as("project's namespace is used by default")
        .exists();
    assertThat(form.getParent().toFile().list())
        .as("Form dialog consists of form, data class and process")
        .containsExactlyInAnyOrder("OrderForm.f.json", "OrderFormData.d.json", "OrderFormProcess.p.json");

    assertOrderData(form.resolveSibling("OrderFormData.d.json"), userType(purchase));

    var formJson = readJson(form);
    var bindings = formJson.path("components").findParents("type").stream()
        .collect(Collectors.toMap(c -> c.path("config").path("value").asString(), c -> c.path("type").asString(),
            (a, b) -> a));
    assertThat(bindings)
        .as("components are bound to the data attributes: %s", formJson.toPrettyString())
        .containsEntry("#{data.product}", "Input")
        .containsEntry("#{data.quantity}", "Input")
        .containsEntry("#{data.deliveryDate}", "DatePicker")
        .containsEntry("#{data.customer.fullName}", "Input")
        .containsEntry("#{data.customer.address}", "Input")
        .containsEntry("#{data.customer.phone}", "Input")
        .containsEntry("#{data.customer.age}", "Input");

    assertThat(spans)
        .as("Must use create-tool for initial correct creation; then the skill to edit the form")
        .usedTools("skill", "axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .calledToolWithout("axonivy-designer-new_axon_ivy_dialog", "namespace") // no guessed namespace
        .viewed("skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void dialogFallsBackToJsf(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        in the 'purchase' project, create an 'InvoiceUpload' dialog
        where the buyer uploads the supplier's invoice as PDF.
        """);

    var dialog = rt.ivyWorkspace().path().resolve("purchase/dialog/com/acme/demo/InvoiceUpload");
    assertThat(dialog.resolve("InvoiceUpload.xhtml"))
        .as("JSF is used, since forms have no file upload")
        .exists();

    var dialogCalls = spans.usedTools().stream()
        .filter(tool -> tool.name().equals("axonivy-designer-new_axon_ivy_dialog")).toList();
    assertThat(dialogCalls)
        .as("no tool call to create a form")
        .isNotEmpty()
        .allMatch(call -> call.arguments().contains("JSF"));

    assertThat(spans).loadedSkill("ivy-ui");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void formExtractsRepeatedGroup(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        in the purchase project, create a SupplierOnboarding dialog
        where a buyer registers a new equipment supplier: company name,
        a sales contact and a support contact (name, email and phone each).
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = findFile(purchase.resolve("dialog"), "SupplierOnboarding.f.json");
    var composites = formComponents(readJson(form), "Composite");
    assertThat(composites)
        .as("sales and support contacts reuse one component twice")
        .hasSize(2);
    var contact = composites.getFirst().path("config");
    assertThat(composites.getLast().path("config").path("name"))
        .isEqualTo(contact.path("name"));

    var componentDir = purchase.resolve("dialog/" + contact.path("name").asString().replace('.', '/'));
    var componentName = componentDir.getFileName().toString();
    var component = readJson(componentDir.resolve(componentName + ".f.json"));
    assertThat(component.at("/config/type").asString()).isEqualTo("COMPONENT");

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void formEmbedsJsfComponentForUnsupportedUi(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        in the purchase project, create a SupplierCertificate dialog where a buyer records
        the supplier's certificate number and expiry date and uploads the certificate as PDF.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = findFile(purchase.resolve("dialog"), "SupplierCertificate.f.json");
    var composites = formComponents(readJson(form), "Composite");
    var componentDir = purchase
        .resolve("dialog/" + composites.getFirst().at("/config/name").asString().replace('.', '/'));
    assertThat(componentDir.resolve(componentDir.getFileName() + ".xhtml"))
        .as("the embedded upload component uses JSF")
        .exists();

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void formEditsTableRowsInPopup(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        In the purchase project, create a PurchaseOrder dialog where a buyer lists the items
        to order with name, quantity and unit price in euros; show the prices with their currency.
        Items are added and changed in a popup, and each item can be removed. In the popup, the name
        is picked from a dropdown of 10 technical products that you invent.
        The buyer can sort and search the items by name, and sees 10 items per page.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = readJson(findFile(purchase.resolve("dialog"), "PurchaseOrder.f.json"));
    var table = formComponents(form, "DataTable").getFirst();
    assertThat(table.at("/config/paginator").asBoolean()).as("items are paged").isTrue();
    assertThat(formComponents(form, "DataTableColumn"))
        .as("a column can be sorted and searched")
        .anySatisfy(column -> {
          assertThat(column.at("/config/sortable").asBoolean()).isTrue();
          assertThat(column.at("/config/filterable").asBoolean()).isTrue();
        });

    var popup = formComponents(form, "Dialog").stream()
        .filter(dialog -> dialog.path("cid").asString().equals(table.at("/config/editDialogId").asString()))
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("editDialogId names no Dialog: " + form.toPrettyString()));
    assertThat(popup.at("/config/linkedComponent").asString())
        .as("the popup is linked back to the table")
        .isEqualTo(table.path("cid").asString());

    var buttons = formComponents(form, "Button").stream()
        .collect(Collectors.toMap(b -> b.at("/config/type").asString(), b -> b.path("config"), (a, b) -> a));
    assertThat(buttons).as("row and popup buttons").containsKeys("EDIT", "DELETE", "DIALOGCANCEL", "DIALOGSAVE");
    assertThat(buttons.get("EDIT").path("action").asString()).as("EDIT action is the plain word").isEqualTo("editRow");
    assertThat(buttons.get("DELETE").path("action").asString()).as("DELETE action is the plain word")
        .isEqualTo("deleteRow");
    assertThat(buttons.get("DIALOGCANCEL").path("name").asString()).as("popup Cancel has a label").isNotBlank();
    assertThat(buttons.get("DIALOGSAVE").path("name").asString()).as("popup Save has a label").isNotBlank();

    assertThat(formComponents(popup.path("config"), "Select")).as("the name is picked from a dropdown in the popup")
        .isNotEmpty();

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void jsfDialog(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        create a new JSF dialog 'OrderOverview' in 'purchase' project.
        The view lets the user enter an order: 'product' (text), 'quantity' (number) and 'deliveryDate' (date),
        and the 'customer' as the existing data class 'User' with all its fields.
        Each input is bound to the dialog data.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var view = purchase.resolve("dialog/com/acme/demo/OrderOverview/OrderOverview.xhtml");
    assertThat(view)
        .as("project's namespace is used by default")
        .exists();
    assertThat(view.getParent().toFile().list())
        .as("JSF dialog consists of view, data class and process")
        .containsExactlyInAnyOrder("OrderOverview.xhtml", "OrderOverviewData.d.json", "OrderOverviewProcess.p.json");

    assertOrderData(view.resolveSibling("OrderOverviewData.d.json"), userType(purchase));

    assertThat(view).content()
        .as("requested template is used by the view")
        .contains("template=\"/layouts/frame-10.xhtml\"");
    assertThat(view).content()
        .as("view components are bound to the data attributes")
        .contains("#{data.product}", "#{data.quantity}", "#{data.deliveryDate}",
            "#{data.customer.fullName}", "#{data.customer.address}", "#{data.customer.phone}", "#{data.customer.age}");

    assertThat(spans)
        .as("Must use create-tool for initial correct creation; then the skill to edit the data class")
        .usedTools("skill", "axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .calledToolWithout("axonivy-designer-new_axon_ivy_dialog", "namespace") // no guessed namespace
        .viewed("skills/ivy-json-files/schemas/project/data-class.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  // Prerequisite for the Form and JSF order-dialog scenarios.
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

  private static void assertUserFields(Path dataClass) throws IOException {
    var dataJson = readJson(dataClass);
    var fieldTypes = dataJson.path("fields").valueStream()
        .collect(Collectors.toMap(f -> f.path("name").asString(), f -> f.path("type").asString()));

    assertThat(fieldTypes).containsKeys("fullName", "address", "phone", "age");
    assertThat(fieldTypes.get("fullName"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("address"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("phone"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("age"))
        .matches("Number|java\\.lang\\.(Number|Integer|Long)");
  }

  private static String userType(Path project) throws IOException {
    var user = readJson(findFile(project.resolve("dataclass"), "User.d.json"));
    return user.path("namespace").asString() + ".User";
  }

  private static void assertOrderData(Path dataClass, String userType) throws IOException {
    var dataJson = readJson(dataClass);
    var fieldTypes = dataJson.path("fields").valueStream()
        .collect(Collectors.toMap(f -> f.path("name").asString(), f -> f.path("type").asString()));
    assertThat(fieldTypes)
        .as("bound attributes exist in dialog data class: %s", dataJson.toPrettyString())
        .containsKeys("product", "quantity", "deliveryDate")
        .containsEntry("customer", userType);
    assertThat(fieldTypes.get("product"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("quantity"))
        .matches("Number|java\\.lang\\.(Number|Integer|Long|Double)|java\\.math\\.BigDecimal");
    assertThat(fieldTypes.get("deliveryDate"))
        .matches("Date|ch\\.ivyteam\\.ivy\\.scripting\\.objects\\.Date|java\\.util\\.Date|java\\.time\\.LocalDate");
  }

  private static List<JsonNode> formComponents(JsonNode form, String... types) {
    var acceptedTypes = List.of(types);
    return form.path("components").findParents("type").stream()
        .filter(component -> acceptedTypes.contains(component.path("type").asString()))
        .toList();
  }

  private static Path findFile(Path dir, String fileName) throws IOException {
    try (var files = Files.walk(dir)) {
      return files.filter(f -> f.getFileName().toString().equals(fileName))
          .findFirst().orElseThrow(() -> new IllegalStateException(fileName + " not found in " + dir));
    }
  }

  private static JsonNode readJson(Path file) throws IOException {
    try (var in = Files.newInputStream(file)) {
      return JsonMapper.shared().readTree(in);
    }
  }

  private static JsonNode procElement(JsonNode process, String type) {
    return process.path("elements").valueStream()
        .filter(e -> type.equals(e.path("type").asString()))
        .findFirst().orElseThrow(() -> new IllegalStateException(type + " not found in " + process.toPrettyString()));
  }

}

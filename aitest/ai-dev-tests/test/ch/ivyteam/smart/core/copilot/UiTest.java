package ch.ivyteam.smart.core.copilot;

import static ch.ivyteam.smart.core.assertion.AspireSpansAssert.assertThat;
import static org.assertj.core.api.Assertions.assertThat;
import static ch.ivyteam.smart.core.copilot.AiUtils.findFile;
import static ch.ivyteam.smart.core.copilot.AiUtils.readJson;

import java.io.IOException;
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

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ExtendWith(AgentRuntimeExtension.class)
public class UiTest {

  @Test
  @Order(Complexity.COMPOSITE)
  void formDialog(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        In the purchase project, create a Dialog Form named OrderForm to enter
        product (text), quantity (number) and deliveryDate (date).
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = findFile(purchase.resolve("dialog"), "OrderForm.f.json");
    assertThat(form.resolveSibling("OrderFormProcess.p.json")).exists();
    assertOrderData(form.resolveSibling("OrderFormData.d.json"));

    var formJson = readJson(form);
    var bindings = formJson.path("components").findParents("type").stream()
        .collect(Collectors.toMap(c -> c.path("config").path("value").asString(), c -> c.path("type").asString(),
            (a, b) -> a));
    assertThat(bindings)
        .as("components are bound to the data attributes: %s", formJson.toPrettyString())
        .containsEntry("#{data.product}", "Input")
        .containsEntry("#{data.quantity}", "Input")
        .containsEntry("#{data.deliveryDate}", "DatePicker");

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/data-class.json",
            "skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void jsfDialog(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        In the purchase project, create a JSF dialog named OrderOverview to enter
        product (text), quantity (number) and deliveryDate (date).
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var view = findFile(purchase.resolve("dialog"), "OrderOverview.xhtml");
    assertThat(view.resolveSibling("OrderOverviewProcess.p.json")).exists();
    assertOrderData(view.resolveSibling("OrderOverviewData.d.json"));

    assertThat(view).content()
        .as("view components are bound to the data attributes")
        .contains("#{data.product}", "#{data.quantity}", "#{data.deliveryDate}");

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/data-class.json");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void formDataTable(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        In the purchase project, create a PurchaseOrder Dialog Form listing items with name and quantity.
        Allow sorting and filtering by name, with 10 rows per page.
        Support deleting rows and editing them in a popup with a name dropdown.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = readJson(findFile(purchase.resolve("dialog"), "PurchaseOrder.f.json"));
    var table = formComponents(form, "DataTable").getFirst();
    assertThat(table.at("/config/paginator").asBoolean()).as("items are paged").isTrue();
    assertThat(table.at("/config/maxRows").asString()).as("10 items per page").isEqualTo("10");
    assertThat(table.at("/config/isEditable").asBoolean()).as("rows can be edited and deleted").isTrue();
    assertThat(formComponents(table.path("config"), "DataTableColumn"))
        .as("the name column can be sorted and filtered")
        .anySatisfy(column -> {
          assertThat(column.at("/config/value").asString()).endsWith(".name}");
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

    var rowButtons = formComponents(table.path("config"), "Button").stream()
        .collect(Collectors.toMap(b -> b.at("/config/type").asString(), b -> b.path("config"), (a, b) -> a));
    assertThat(rowButtons).as("row actions").containsKeys("EDIT", "DELETE");
    assertThat(rowButtons.get("EDIT").path("action").asString()).isEqualTo("editRow");
    assertThat(rowButtons.get("DELETE").path("action").asString()).isEqualTo("deleteRow");
    assertThat(popup.at("/config/buttons").valueStream().map(b -> b.at("/config/type").asString()))
        .as("the popup can save or cancel edits")
        .contains("DIALOGCANCEL", "DIALOGSAVE");

    assertThat(formComponents(popup.path("config"), "Select"))
        .as("the item name is picked from a bound dropdown in the popup")
        .anySatisfy(select -> assertThat(select.at("/config/value").asString()).endsWith(".name}"));

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void componentReuse(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        In the purchase project, create a SupplierContacts Dialog Form with sales and support contacts.
        Each contact has a name, email, phone number and job title.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = findFile(purchase.resolve("dialog"), "SupplierContacts.f.json");
    var composites = formComponents(readJson(form), "Composite");
    assertThat(composites)
        .as("sales and support contacts reuse one component twice")
        .hasSize(2);
    var contact = composites.getFirst().path("config");
    assertThat(contact.path("name").asString()).isNotBlank();
    assertThat(composites.getLast().path("config").path("name"))
        .isEqualTo(contact.path("name"));
    assertThat(contact.path("parameters").size()).as("contact data is passed to the component").isPositive();
    assertThat(composites.getLast().at("/config/parameters"))
        .as("sales and support contacts use separate data")
        .isNotEqualTo(contact.path("parameters"));

    var componentDir = purchase.resolve("dialog/" + contact.path("name").asString().replace('.', '/'));
    var componentName = componentDir.getFileName().toString();
    var component = readJson(componentDir.resolve(componentName + ".f.json"));
    assertThat(component.at("/config/type").asString()).isEqualTo("COMPONENT");
    assertThat(formComponents(component, "Input").stream().map(input -> input.at("/config/value").asString()))
        .as("the reusable component binds each contact field")
        .anyMatch(value -> value.endsWith(".name}"))
        .anyMatch(value -> value.endsWith(".email}"));

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/form.json")
        .didNotUseTools("web_fetch", "web_search");
  }

  @Test
  @Order(Complexity.COMPOSITE)
  void embeddedJsf(AgentRuntime rt) throws Exception {
    var spans = rt.prompt("""
        In the purchase project, create a SupplierCertificate Dialog Form to enter
        a certificate number and upload the certificate as PDF.
        """);

    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = findFile(purchase.resolve("dialog"), "SupplierCertificate.f.json");
    var formJson = readJson(form);
    var composites = formComponents(formJson, "Composite");
    assertThat(composites).as("the unsupported upload is embedded as a component").isNotEmpty();
    var componentDir = purchase
        .resolve("dialog/" + composites.getFirst().at("/config/name").asString().replace('.', '/'));
    var view = componentDir.resolve(componentDir.getFileName() + ".xhtml");
    assertThat(view).as("the embedded component uses JSF").exists();
    assertThat(formComponents(formJson, "Input")).as("the certificate number stays in the Form").isNotEmpty();

    assertThat(spans)
        .usedTools("axonivy-designer-new_axon_ivy_dialog")
        .loadedSkill("ivy-ui")
        .viewed("skills/ivy-json-files/schemas/project/form.json");
  }

  @Test
  @Order(Complexity.INDEPENDENT)
  void formToJsf(AgentRuntime rt) throws Exception {
    var purchase = rt.ivyWorkspace().path().resolve("purchase");
    var form = findFile(purchase.resolve("dialog"), "Note.f.json");
    assertThat(form).exists();

    var spans = rt.prompt("Convert the Note Dialog Form in the purchase project to JSF.");

    assertThat(spans)
        .usedTools("axonivy-designer-convert_dialog_form_to_jsf")
        .didNotUseTools("axonivy-designer-new_axon_ivy_dialog");
    assertThat(form.resolveSibling("Note.xhtml")).content().contains("#{data.note}");
    assertThat(form).doesNotExist();
  }

  private static void assertOrderData(Path dataClass) throws IOException {
    var dataJson = readJson(dataClass);
    var fieldTypes = dataJson.path("fields").valueStream()
        .collect(Collectors.toMap(f -> f.path("name").asString(), f -> f.path("type").asString()));
    assertThat(fieldTypes)
        .as("bound attributes exist in dialog data class: %s", dataJson.toPrettyString())
        .containsKeys("product", "quantity", "deliveryDate");
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
}
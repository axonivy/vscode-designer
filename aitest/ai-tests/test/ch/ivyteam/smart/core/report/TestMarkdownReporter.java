package ch.ivyteam.smart.core.report;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;
import ch.ivyteam.smart.core.aspire.TestAspireSpans;
import tools.jackson.databind.ObjectMapper;

public class TestMarkdownReporter {

  @Test
  void writesMarkdownTable() {
    var reporter = new MarkdownReporter();
    reporter.init("CopilotIntegration");
    var spans = TestAspireSpans.read("spans-copilot.json");
    reporter.append("myTest", spans.tokenUsage(), spans.usedTools());

    assertThat(reporter.toMarkdownContent()).isEqualTo("""
        ## AI test report

        Test file: `aitest/ai-dev-tests/test/ch/ivyteam/smart/core/copilot/CopilotIntegrationTest.java`

        | Test | Input tokens | Output tokens | Tools used |
        | --- | ---: | ---: | --- |
        | `myTest` | 38517 | 765 | <details><summary>axonivy-designer-new_axon_ivy_project</summary><br><strong>axonivy-designer-new_axon_ivy_project</strong><pre><code>{"groupId":"com.example","name":"flight-simulator","path":"/workspace","projectId":"flight-simulator"}</code></pre></details> |
        """);
  }

  @Test
  void writesNoneWhenNoToolsWereUsed() {
    var reporter = new MarkdownReporter();
    reporter.init("CopilotIntegration");
    reporter.append("myTest", new TokenUsage(1, 2), List.of());

    assertThat(reporter.toMarkdownContent()).contains("| `myTest` | 1 | 2 | None |");
  }

  @Test
  void keepsMultipleToolsOnOneTableRow() throws Exception {
    var toolSpan = new ObjectMapper().readTree("""
        {"attributes":[
          {"key":"gen_ai.tool.name","value":{"stringValue":"edit"}},
          {"key":"gen_ai.tool.call.arguments","value":{"stringValue":"first\\nsecond"}}
        ]}
        """);
    var reporter = new MarkdownReporter();
    reporter.init("CopilotIntegration");
    reporter.append("myTest", new TokenUsage(1, 2),
        List.of(new UsedTool(toolSpan), new UsedTool(toolSpan)));

    var report = reporter.toMarkdownContent();
    assertThat(report).contains("<summary>edit, edit</summary>");
    assertThat(report).contains("<strong>edit</strong><pre><code>first&#10;second</code></pre>");
    assertThat(report.split("\\n")).hasSize(7);
  }
}

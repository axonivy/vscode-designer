package ch.ivyteam.smart.core.report;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.TestAspireSpans;

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
        | `myTest` | 38517 | 765 | axonivy-designer-new_axon_ivy_project |
        """);
  }

  @Test
  void writesNoneWhenNoToolsWereUsed() {
    var reporter = new MarkdownReporter();
    reporter.init("CopilotIntegration");
    reporter.append("myTest", new TokenUsage(1, 2), List.of());

    assertThat(reporter.toMarkdownContent()).contains("| `myTest` | 1 | 2 | None |");
  }
}
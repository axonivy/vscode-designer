package ch.ivyteam.smart.core.report;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

public class MarkdownReporter implements Reporter {

  private List<String> lines = new ArrayList<>();

  @Override
  public void init(String testUnit) {
    lines.add("## AI test report");
    lines.add("");
    lines.add("Test file: `aitest/ai-dev-tests/test/ch/ivyteam/smart/core/copilot/CopilotIntegrationTest.java`");
    lines.add("");
    lines.add("| Test | Input tokens | Output tokens | Tools used |");
    lines.add("| --- | ---: | ---: | --- |");
  }

  @Override
  public void append(String name, TokenUsage tokenUsage, List<UsedTool> usedTools) {
    var tools = usedTools.stream()
        .map(UsedTool::name)
        .distinct()
        .sorted()
        .collect(Collectors.joining(", "));
    if (tools.isEmpty()) {
      tools = "None";
    }
    lines.add(String.format("| `%s` | %d | %d | %s |", name,
        tokenUsage.input(), tokenUsage.output(), tools));
  }

  public String toMarkdownContent() {
    return String.join("\n", lines) + "\n";
  }

  public void toMarkdownFile(Path report) {
    try {
      var parent = report.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      Files.writeString(report, toMarkdownContent(),
          StandardCharsets.UTF_8,
          StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    } catch (IOException ex) {
      throw new UncheckedIOException("Failed to write AI test report " + report, ex);
    }
  }
}
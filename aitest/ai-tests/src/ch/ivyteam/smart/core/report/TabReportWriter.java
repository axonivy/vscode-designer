package ch.ivyteam.smart.core.report;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.stream.Collectors;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

public class TabReportWriter implements Reporter {

  private List<String> lines;

  public TabReportWriter() {
    this.lines = new java.util.ArrayList<>();
  }

  @Override
  public void init(String testUnit) {
    lines.add("test\tinputTokens\toutputTokens\ttools");
  }

  public void append(String name, TokenUsage tokenUsage, List<UsedTool> usedTools) {
    var tools = usedTools.stream()
        .map(UsedTool::name)
        .distinct()
        .sorted()
        .collect(Collectors.joining(", "));
    var line = String.join("\t", name,
        Integer.toString(tokenUsage.input()), Integer.toString(tokenUsage.output()), tools);
    lines.add(line);
  }
  
  public String toTabContent() {
    return String.join("\n", lines);
  }

  public void toTabFile(Path report) {
    try {
      var parent = report.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      Files.writeString(report, toTabContent(),
          StandardCharsets.UTF_8,
          StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    } catch (IOException ex) {
      throw new UncheckedIOException("Failed to write AI test report "+report, ex);
    }
  }

}
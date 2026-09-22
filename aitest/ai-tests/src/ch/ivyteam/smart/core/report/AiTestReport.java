package ch.ivyteam.smart.core.report;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.stream.Collectors;

import ch.ivyteam.smart.core.aspire.AspireSpans;
import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

public class AiTestReport {

  private ReportFileWriter writer;

  public void resetReport() {
    this.writer = ReportFileWriter.of();
    this.writer.init();
  }

  public void report(String testName, AspireSpans spans) {
    var usage = spans.tokenUsage();
    
    System.out.println("Executed "+testName +
    ": inputTokens="+usage.input()+
    ", outputTokens="+usage.output()+
    ", tools="+spans.usedTools().stream().map(UsedTool::name).toList());

    this.writer.append(testName, usage, spans.usedTools());
  }

  private static class ReportFileWriter {

    private final Path report;

    private ReportFileWriter(Path report) {
      this.report = report;
    }

    public static ReportFileWriter of() {
      var report = Path.of(System.getProperty("ai.report.file", "target/ai-test-report.tsv"));
      return new ReportFileWriter(report);
    }

    public void init() {
      try {
        var parent = report.getParent();
        if (parent != null) {
          Files.createDirectories(parent);
        }
        Files.writeString(report, "test\tinputTokens\toutputTokens\ttools\n", StandardCharsets.UTF_8,
            StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
      } catch (IOException ex) {
        throw new UncheckedIOException("Failed to initialize AI test report", ex);
      }
    }

    public void append(String name, TokenUsage tokenUsage, List<UsedTool> usedTools) {
      var tools = usedTools.stream()
          .map(UsedTool::name)
          .distinct()
          .sorted()
          .collect(Collectors.joining(", "));
      var line = String.join("\t", name,
          Integer.toString(tokenUsage.input()), Integer.toString(tokenUsage.output()), tools) + "\n";
      try {
        Files.writeString(report, line, StandardCharsets.UTF_8,
            StandardOpenOption.CREATE, StandardOpenOption.APPEND);
      } catch (IOException ex) {
        throw new UncheckedIOException("Failed to write AI test report", ex);
      }
    }

  }
}

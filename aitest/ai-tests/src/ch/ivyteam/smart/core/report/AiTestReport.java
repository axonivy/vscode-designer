package ch.ivyteam.smart.core.report;

import java.util.ArrayList;
import java.util.List;

import ch.ivyteam.smart.core.aspire.AspireSpans;

public class AiTestReport {

  private List<Reporter> reporters = new ArrayList<>();

  public void resetReport() {
    reporters.stream().forEach(r -> r.init("CopilotIntegration"));
  }

  public void report(String testName, AspireSpans spans) {
    var usage = spans.tokenUsage();
    var tools = spans.usedTools();

    reporters.stream().forEach(r -> r.append(testName, usage, tools));
  }

  public void register(Reporter reporter) {
    this.reporters.add(reporter);
  }

}

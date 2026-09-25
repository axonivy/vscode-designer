package ch.ivyteam.smart.core.report;

import java.util.List;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

public class SysoutReporter implements Reporter {

  @Override
  public void append(String testName, String userMessage, TokenUsage usage, List<UsedTool> usedTools) {
    System.out.println("Executed " + testName +
        ": inputTokens=" + usage.input() +
        ", outputTokens=" + usage.output() +
        ", tools=" + usedTools.stream().map(UsedTool::name).toList());
  }
  
}
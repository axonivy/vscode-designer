package ch.ivyteam.smart.core.report;

import java.util.List;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

public interface Reporter {

  default void init(String testUnit){}

  void append(String testName, TokenUsage tokenUsage, List<UsedTool> usedTools);
}

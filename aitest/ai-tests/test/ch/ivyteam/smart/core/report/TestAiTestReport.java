package ch.ivyteam.smart.core.report;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import ch.ivyteam.smart.core.aspire.AspireSpans.TokenUsage;
import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;
import ch.ivyteam.smart.core.aspire.TestAspireSpans;

public class TestAiTestReport {
  
  @Test 
  void report(){
    var aspireSpans = TestAspireSpans.read("spans-copilot.json");

    var report = new AiTestReport();
    var memory = new MemoryReporter();
    report.register(memory);
    report.report("myTest", aspireSpans);

    assertThat(memory.testName)
      .isEqualTo("myTest");
    assertThat(memory.tokenUsage.input())
      .isEqualTo(38517);
    assertThat(memory.tokenUsage.output())
      .isEqualTo(765);
    assertThat(memory.usedTools).extracting(UsedTool::name)
      .containsOnly("axonivy-designer-new_axon_ivy_project");
  }

  private static class MemoryReporter implements Reporter {

    private String testName;
    private TokenUsage tokenUsage;
    private List<UsedTool> usedTools;

    @Override
    public void append(String testName, TokenUsage tokenUsage, List<UsedTool> usedTools) {
      this.testName = testName;
      this.tokenUsage = tokenUsage;
      this.usedTools = usedTools;
    }

  }

}

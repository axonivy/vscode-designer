package ch.ivyteam.smart.core.aspire;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.junit.jupiter.api.Test;

import ch.ivyteam.smart.core.aspire.AspireSpans.UsedTool;

public class TestAspireSpans {

  private final AspireSpans spans = read("spans-copilot.json");
  
  @Test
  void tools() {
    assertThat(spans.tools()
        .names())
        .contains("axonivy-designer-new_axon_ivy_project");
  }

  @Test
  void tokenUsage() {
    var spans = read("spans-copilot.json");
    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isEqualTo(38517);
    assertThat(tokenUsage.output()).isEqualTo(765);
  }

  @Test
  void userMessage() {
    assertThat(spans.userMessage()).contains("create an axon ivy project for a flight-simulator");
  }

  @Test
  void usedTools() {
    assertThat(spans.usedTools()).hasSize(1);
    var newProject = spans.usedTools().get(0);
    assertThat(newProject.name())
      .isEqualTo("axonivy-designer-new_axon_ivy_project");
    assertThat(newProject.arguments()).contains("\"projectId\":\"flight-simulator\"");
    assertThat(newProject.result()).contains("Project created successfully at '/workspace/flight-simulator'");
  }

  @Test
  void outputMessage() {
    assertThat(spans.outputMessage()).contains("Project created at /workspace/flight-simulator");
  }

  public static AspireSpans read(String resource) {
    var in = TestAspireSpans.class.getResourceAsStream(resource);
    if (in == null) {
      throw new IllegalArgumentException("Resource not found: " + resource);
    }
    try (in) {
      return AspireSpans.of(new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}

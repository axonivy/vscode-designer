package ch.ivyteam.smart.core.aspire;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.junit.jupiter.api.Test;

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
  void usedTools() {
    assertThat(spans.usedTools()).hasSize(1);
    assertThat(spans.usedTools().get(0).name())
      .isEqualTo("axonivy-designer-new_axon_ivy_project");
  }

  private AspireSpans read(String resource) {
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

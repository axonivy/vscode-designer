package ch.ivyteam.smart.core.aspire;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.junit.jupiter.api.Test;

public class TestAspireSpans {
  
  @Test
  void tools() {
    var spans = read("spans-copilot.json");
    assertThat(spans.tools()
        .names())
        .contains("axonivy-designer-new_axon_ivy_project");
  }

  @Test
  void tokenUsage() {
    var spans = read("spans-copilot.json");
    var tokenUsage = spans.tokenUsage();
    assertThat(tokenUsage.input()).isEqualTo(142337);
    assertThat(tokenUsage.output()).isEqualTo(4092);
  }

  private AspireSpans read(String resource) {
    try(var in = TestAspireSpans.class.getResourceAsStream(resource)) {
      return AspireSpans.of(new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}

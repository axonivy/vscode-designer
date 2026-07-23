package ch.ivyteam.smart.core.copilot;

import static dev.langchain4j.model.openai.OpenAiChatModelName.GPT_5_MINI;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.Network;

import ch.ivyteam.smart.core.aspire.AspireAPI;
import ch.ivyteam.smart.core.aspire.AspireContainer;
import ch.ivyteam.smart.core.telemetry.TelemetryUtils;

public class CopilotIntegrationTest {

  /*
   * To keep Aspire alive and observe the traces in its dashboard,
   * set this flag and start your own Aspire instance:
   *
   * ```
   * docker run -d \
   * -p 18888:18888 \
   * -p 4318:18890 \
   * -e DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true \
   * -e Dashboard__Api__Enabled=true \
   * --name aspire \
   * mcr.microsoft.com/dotnet/aspire-dashboard:latest
   * ```
   */
  static boolean manualAspire = System.getenv("MANUAL_ASPIRE") != null;

  static Network network;
  static AspireContainer aspireContainer;
  @SuppressWarnings("resource")
  static CopilotContainer copilotContainer = new CopilotContainer()
      // .withEnv("COPILOT_PROVIDER_BASE_URL", OPENAI_API_URL)
      // .withEnv("COPILOT_PROVIDER_API_KEY", OPENAI_API_KEY)
      .withEnv("COPILOT_MODEL", GPT_5_MINI.toString())
      .withEnv("OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "true");

  static Copilot copilot;
  static AspireAPI aspireApi;

  @BeforeAll
  static void beforeAll() {
    if (manualAspire) {
      initManualAspire();
    } else {
      initTestcontainersAspire();
    }
    copilotContainer.start();
    copilot = Copilot.create(copilotContainer, System.getenv("VSCODE_MCP_URI"));
  }

  private static void initManualAspire() {
    copilotContainer
        .withEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://host.docker.internal:4318");

    aspireApi = AspireAPI.create("http://localhost:18888");
  }

  @SuppressWarnings("resource")
  private static void initTestcontainersAspire() {
    network = Network.newNetwork();

    aspireContainer = new AspireContainer()
        .withNetwork(network)
        .withNetworkAliases("aspire")
        .withExposedPorts(18888, 18890)
        .withEnv("Dashboard__Api__Enabled", "true");
    aspireContainer.start();

    copilotContainer
        .withNetwork(network)
        .withEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://aspire:18890");

    aspireApi = AspireAPI.create("http://" + aspireContainer.getHost() + ":" + aspireContainer.getMappedPort(18888));
  }

  @AfterAll
  static void afterAll() {
    copilotContainer.stop();
    if (aspireContainer != null) {
      aspireContainer.stop();
    }
    if (network != null) {
      network.close();
    }
  }

  @Test
  void createProject() throws Exception {
    var resource = copilot.prompt("create an axon ivy project");
    var spans = aspireApi.spansOfResource(resource);
    var tokenUsage = TelemetryUtils.tokenUsage(spans);
    assertThat(tokenUsage.input()).isLessThan(150000);
    assertThat(tokenUsage.output()).isLessThan(10000);
  }
}

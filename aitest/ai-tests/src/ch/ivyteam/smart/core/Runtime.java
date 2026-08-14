package ch.ivyteam.smart.core;

import java.nio.file.Files;
import java.nio.file.Path;

import org.testcontainers.DockerClientFactory;

import com.github.dockerjava.api.exception.NotFoundException;

import ch.ivyteam.smart.core.aspire.AspireAPI;
import ch.ivyteam.smart.core.aspire.AspireContainer;
import ch.ivyteam.smart.core.copilot.Copilot;
import ch.ivyteam.smart.core.copilot.CopilotContainer;
import ch.ivyteam.smart.core.copilot.DesignerMcpContainer;

public class Runtime {
  private static final String NETWORK_NAME = "smart-test-network";

  /*
  * Reuse containers between test runs to speed up development.
  * Enabled by default for local development, disabled in CI.
  * https://java.testcontainers.org/features/reuse/
  */
  static boolean reuseContainers = !"false".equalsIgnoreCase(System.getenv("TESTCONTAINERS_REUSE_ENABLE"));

  static AspireContainer aspireContainer;
  static DesignerMcpContainer designerMcpContainer;
  static CopilotContainer copilotContainer;

  static Copilot copilot;
  static AspireAPI aspireApi;

  private static void initTestcontainersAspire(Copilot copilot) {
    ensureNetworkExists();

    designerMcpContainer = initDesignerMcpContainer();
    designerMcpContainer.start();
    aspireContainer = initAspireContainer();
    aspireContainer.start();

    copilotContainer = initCopilotContainer();
    copilotContainer.withNetworkMode(NETWORK_NAME);
    copilot.otlpEndpoint("http://aspire:18890");

    aspireApi = AspireAPI.create("http://" + aspireContainer.getHost() + ":" + aspireContainer.getMappedPort(18888));
    System.out.println("Aspire dashboard bound: " + aspireApi);
  }

  @SuppressWarnings("resource")
  private static AspireContainer initAspireContainer() {
    return new AspireContainer()
      .withNetworkMode(NETWORK_NAME)
      .withCreateContainerCmdModifier(command -> command.withAliases("aspire"))
        .withExposedPorts(18888, 18890)
        .withEnv("Dashboard__Api__Enabled", "true")
        .withReuse(reuseContainers);
  }

  @SuppressWarnings("resource")
  private static DesignerMcpContainer initDesignerMcpContainer() {
    String workspaceRoot = findWorkspaceRoot().toString();
    String javaHome = System.getenv("JAVA_HOME");
    return new DesignerMcpContainer(workspaceRoot, javaHome)
        .withNetworkMode(NETWORK_NAME)
        .withCreateContainerCmdModifier(command -> command.withAliases(DesignerMcpContainer.NETWORK_ALIAS))
        .withReuse(reuseContainers);
  }

  @SuppressWarnings("resource")
  private static CopilotContainer initCopilotContainer() {
    var copilot = new CopilotContainer(findWorkspaceRoot().toString())
    .withEnv("COPILOT_MODEL", "gpt-5-mini")
    .withEnv("GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP", "true")
    .withEnv("OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "true")
    .withReuse(reuseContainers);
    authorize(copilot);
    return copilot;
  }

  private static void authorize(CopilotContainer copilot) {
    String openAiKey = System.getenv("OPENAI_API_KEY");
    if (openAiKey != null && !openAiKey.isBlank()) {
      System.out.println("Copilot in BYOM mode: using OpenAI API key from environment variable OPENAI_API_KEY");
      copilot
        .withEnv("COPILOT_PROVIDER_BASE_URL", "https://api.openai.com/v1")
        .withEnv("COPILOT_PROVIDER_API_KEY", openAiKey);
      return;
    }
    var copilotToken = copilotToken();
    if (copilotToken != null && !copilotToken.isBlank()) {
      System.out.println("Copilot in GitHub mode: using GitHub token from environment variable COPILOT_TOKEN or GITHUB_TOKEN");
      copilot.withEnv("COPILOT_GITHUB_TOKEN", copilotToken);
    }
    throw new IllegalStateException("No OpenAI API key or GitHub token found in environment variables. \n" +
      "Please set OPENAI_API_KEY or COPILOT_TOKEN/GITHUB_TOKEN.");
  }

  private static void ensureNetworkExists() {
    var dockerClient = DockerClientFactory.instance().client();
    try {
      dockerClient.inspectNetworkCmd().withNetworkId(NETWORK_NAME).exec();
    } catch (NotFoundException exception) {
      dockerClient.createNetworkCmd().withName(NETWORK_NAME).withEnableIpv6(true).exec();
    }
  }

  private static Path findWorkspaceRoot() {
    Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath();
    while (current != null) {
      if (Files.exists(current.resolve(".github/workflows/mcp.sh"))) {
        return current;
      }
      current = current.getParent();
    }
    throw new IllegalStateException("Could not locate workspace root containing .github/workflows/mcp.sh");
  }

  private static String copilotToken() {
    String token = System.getenv("COPILOT_TOKEN");
    return token == null || token.isBlank() ? System.getenv("GITHUB_TOKEN") : token;
  }

  public void start() {
    copilot = new Copilot(copilotContainer);
    System.out.println("Container reuse: " + reuseContainers);
    initTestcontainersAspire(copilot);
    copilotContainer.start();
    copilot.addMcp(designerMcpContainer.getMcpUri());
  }

  public void stop() {
    if (reuseContainers) {
      System.out.println("Reusing containers: not stopping them!");
      return;
    }
    System.out.println("Stopping containers...");
    copilotContainer.stop();
    if (aspireContainer != null) {
      aspireContainer.stop();
    }
    if (designerMcpContainer != null) {
      designerMcpContainer.stop();
    }
  }

  public Copilot copilot() {
    return copilot;
  }

  public AspireAPI aspire() {
    return aspireApi;
  }
}
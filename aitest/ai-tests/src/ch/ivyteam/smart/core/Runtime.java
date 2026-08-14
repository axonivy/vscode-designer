package ch.ivyteam.smart.core;

import java.nio.file.Files;
import java.nio.file.Path;

import org.testcontainers.containers.Network;

import ch.ivyteam.smart.core.aspire.AspireAPI;
import ch.ivyteam.smart.core.aspire.AspireContainer;
import ch.ivyteam.smart.core.copilot.Copilot;
import ch.ivyteam.smart.core.copilot.CopilotContainer;
import ch.ivyteam.smart.core.copilot.DesignerMcpContainer;

public class Runtime {
  private static final String DEFAULT_MCP_URI = "http://127.0.0.1:32140/mcp";
  private static final String DESIGNER_MCP_URI = "http://designer-mcp:32140/mcp";

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

  /*
  * Reuse containers between test runs to speed up development.
  * Enabled by default for local development, disabled in CI.
  * https://java.testcontainers.org/features/reuse/
  */
  static boolean reuseContainers = !"false".equalsIgnoreCase(System.getenv("TESTCONTAINERS_REUSE_ENABLE"));

  static Network network;
  static AspireContainer aspireContainer;
  static DesignerMcpContainer designerMcpContainer;
  @SuppressWarnings("resource")
  static CopilotContainer copilotContainer = new CopilotContainer()
      // .withEnv("COPILOT_PROVIDER_BASE_URL", OPENAI_API_URL)
      // .withEnv("COPILOT_PROVIDER_API_KEY", OPENAI_API_KEY)
      .withEnv("COPILOT_GITHUB_TOKEN", System.getenv("GITHUB_TOKEN"))
      .withEnv("COPILOT_MODEL", "gpt-5-mini")
      .withEnv("OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "true")
      .withReuse(reuseContainers);

  static Copilot copilot;
  static AspireAPI aspireApi;

  private static void initManualAspire(Copilot copilot) {
    copilot.otlpEndpoint("http://host.docker.internal:4318");
    aspireApi = AspireAPI.create("http://localhost:18888");
  }

  private static void initTestcontainersAspire(Copilot copilot) {
    network = Network.newNetwork();

    
    designerMcpContainer = initDesignerMcpContainer();
    designerMcpContainer.start();
    aspireContainer = initAspireContainer();
    aspireContainer.start();

    copilotContainer.withNetwork(network);
    copilot.otlpEndpoint("http://aspire:18890");

    aspireApi = AspireAPI.create("http://" + aspireContainer.getHost() + ":" + aspireContainer.getMappedPort(18888));
    System.out.println("Aspire dashboard bound: " + aspireApi);
  }

  @SuppressWarnings("resource")
  private static AspireContainer initAspireContainer() {
    return new AspireContainer()
        .withNetwork(network)
        .withNetworkAliases("aspire")
        .withExposedPorts(18888, 18890)
        .withEnv("Dashboard__Api__Enabled", "true")
        .withReuse(reuseContainers);
  }

  @SuppressWarnings("resource")
  private static DesignerMcpContainer initDesignerMcpContainer() {
    String workspaceRoot = findWorkspaceRoot().toString();
    String javaHome = System.getenv("JAVA_HOME");
    return new DesignerMcpContainer(workspaceRoot, javaHome)
        .withNetwork(network)
        .withNetworkAliases(DesignerMcpContainer.NETWORK_ALIAS)
        .withReuse(reuseContainers);
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

  public void start() {
    copilot = new Copilot(copilotContainer);
    System.out.println("Container reuse: " + reuseContainers);
    if (manualAspire) {
      initManualAspire(copilot);
    } else {
      initTestcontainersAspire(copilot);
    }
    copilotContainer.start();
    String mcpUri = System.getenv("VSCODE_MCP_URI");
    if (mcpUri == null || mcpUri.isBlank()) {
      mcpUri = designerMcpContainer != null ? DESIGNER_MCP_URI : DEFAULT_MCP_URI;
    }
    copilot.addMcp(mcpUri);
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
    if (network != null) {
      network.close();
    }
  }

  public Copilot copilot() {
    return copilot;
  }

  public AspireAPI aspire() {
    return aspireApi;
  }
}
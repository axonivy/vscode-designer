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
    return new CopilotContainer(findWorkspaceRoot().toString())
      .withReuse(reuseContainers);
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
    if (aspireContainer != null) {
      aspireContainer.stop();
    }
    if (designerMcpContainer != null) {
      designerMcpContainer.stop();
    }
    if (copilotContainer != null) {
      copilotContainer.stop();
    }
  }

  public Copilot copilot() {
    return copilot;
  }

  public AspireAPI aspire() {
    return aspireApi;
  }
}
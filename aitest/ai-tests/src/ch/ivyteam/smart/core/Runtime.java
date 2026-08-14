package ch.ivyteam.smart.core;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;

import com.github.dockerjava.api.exception.NotFoundException;

import ch.ivyteam.smart.core.aspire.AspireAPI;
import ch.ivyteam.smart.core.aspire.AspireContainer;
import ch.ivyteam.smart.core.copilot.Copilot;
import ch.ivyteam.smart.core.copilot.CopilotContainer;
import ch.ivyteam.smart.core.mcp.DesignerMcpContainer;

public class Runtime {
  private static final String NETWORK_NAME = "smart-test-network";

  /*
  * Reuse containers between test runs to speed up development.
  * Enabled by default for local development, disabled in CI.
  * https://java.testcontainers.org/features/reuse/
  */
  static boolean reuseContainers = !"false".equalsIgnoreCase(System.getenv("TESTCONTAINERS_REUSE_ENABLE"));

  static List<GenericContainer<?>> containers = new ArrayList<>();

  static Copilot copilot;
  static AspireAPI aspireApi;

  public void start() {
    System.out.println("Container reuse: " + reuseContainers);
    ensureNetworkExists();
    
    String workspaceRoot = findWorkspaceRoot().toString();
    String javaHome = System.getenv("JAVA_HOME");
    var designerMcpContainer = new DesignerMcpContainer(workspaceRoot, javaHome);
    startContainer(designerMcpContainer);
    
    var aspireContainer = new AspireContainer();
    startContainer(aspireContainer);
    aspireApi = AspireAPI.create("http://" + aspireContainer.getHost() + ":" + aspireContainer.getMappedPort(18888));
    System.out.println("Aspire dashboard bound: " + aspireApi);
    
    var copilotContainer = new CopilotContainer(workspaceRoot);
    copilot = new Copilot(copilotContainer);
    copilot.otlpEndpoint(aspireContainer.getAspireEndpoint());
    startContainer(copilotContainer);
    copilot.addMcp(designerMcpContainer.getMcpUri());
  }

  private void startContainer(GenericContainer<?> container) {
    container.withNetworkMode(NETWORK_NAME).withReuse(reuseContainers);
    container.start();
    containers.add(container);
  }

  public void stop() {
    if (reuseContainers) {
      System.out.println("Reusing containers: not stopping them!");
      return;
    }
    System.out.println("Stopping containers...");
    for (var container : containers) {
      container.stop();
    }
  }

  public Copilot copilot() {
    return copilot;
  }

  public AspireAPI aspire() {
    return aspireApi;
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
}

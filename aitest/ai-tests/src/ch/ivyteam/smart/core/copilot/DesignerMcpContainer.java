package ch.ivyteam.smart.core.copilot;

import java.time.Duration;

import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

public class DesignerMcpContainer extends GenericContainer<DesignerMcpContainer> {

  public static final String NETWORK_ALIAS = "designer-mcp";
  public static final int MCP_PORT = 32140;

  public DesignerMcpContainer(String workspaceRoot, String javaHome) {

    //super("mcr.microsoft.com/playwright:v1.54.2-noble");
    super(DockerImageName.parse("mcr.microsoft.com/playwright:v1.54.2-noble"));

    if (javaHome == null || javaHome.isBlank()) {
      throw new IllegalStateException("JAVA_HOME must be set to run designer-mcp container");
    }

    withWorkingDirectory("/workspace");
    configureContainerUser();
    System.out.println("Starting designer-mcp container with workspace root: " + workspaceRoot);
    withFileSystemBind(workspaceRoot, "/workspace", BindMode.READ_WRITE);
    withFileSystemBind(javaHome, javaHome, BindMode.READ_ONLY);
    withEnv("JAVA_HOME", javaHome);
    withExposedPorts(MCP_PORT);
    waitingFor(Wait
        .forListeningPorts(MCP_PORT)
        .withStartupTimeout(Duration.ofSeconds(300)));

    followOutput(frame -> {
      // include stream prefix info and actual line
      String prefix = "LOG:"+frame.getType().name(); // STDOUT/STDERR
      frame.getUtf8String().lines().forEach(line -> {
        System.out.println("[" + prefix + "] " + line);
      });
      System.out.print("[" + prefix + "] " + frame.getUtf8String());
    });


    withCommand(
        "bash", "-lc", ""
      //  "set -euo pipefail\n"
            + "./.github/workflows/mcp.sh vscode-designer.code-workspace\n"
            + "exec tail -f /dev/null");
  }

  private void configureContainerUser() {
    String uid = System.getenv("UID");
    String gid = System.getenv("GID");
    String user = uid + ":" + gid;
    System.out.println("Configuring designer-mcp container to run as user: " + user);
    if (uid != null && !uid.isBlank() && gid != null && !gid.isBlank()) {
      withCreateContainerCmdModifier(cmd -> {
        cmd.withUser(user);
      });
    }
  }

  @Override
  public String getContainerId() {
    return "designer-mcp-test";
  }
}
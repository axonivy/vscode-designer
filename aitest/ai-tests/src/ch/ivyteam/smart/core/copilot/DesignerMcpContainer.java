package ch.ivyteam.smart.core.copilot;

import java.time.Duration;

import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.output.OutputFrame;
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
    System.out.println("Waiting for MCP port " + MCP_PORT + " to be available in designer-mcp container...");
    waitingFor(Wait
        .forListeningPorts(MCP_PORT)
        .withStartupTimeout(Duration.ofSeconds(600)));

    withLogConsumer(frame -> {
      if (frame.getType() == OutputFrame.OutputType.END) {
        return;
      }
      String text = frame.getUtf8String();
      if (!text.isEmpty()) {
        System.out.print("[DESIGNER:" + frame.getType().name() + "] " + text);
      }
    });


    withCommand(
        "bash", "-lc", ""
      //  "set -euo pipefail\n"
            + "./.github/workflows/mcp.sh vscode-designer.code-workspace\n"
            + "exec tail -f /dev/null");
  }

  private void configureContainerUser() {
    String uid = System.getenv("HOST_UID");
    String gid = System.getenv("HOST_GID");
    String user = uid + ":" + gid;
    System.out.println("Configuring designer-mcp container to run as user: " + user);
    if (uid != null && !uid.isBlank() && gid != null && !gid.isBlank()) {
      withCreateContainerCmdModifier(cmd -> {
        cmd.withUser(user);
      });
    }
  }

  public String getMcpUri() {
    return "http://" + NETWORK_ALIAS + ":" + MCP_PORT + "/mcp";
  }

}
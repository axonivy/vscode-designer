package ch.ivyteam.smart.core.mcp;

import java.nio.file.Path;
import java.time.Duration;

import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import ch.ivyteam.smart.core.SysoutLogger;

public class DesignerMcpContainer extends GenericContainer<DesignerMcpContainer> {

  private static final String NETWORK_ALIAS = "designer-mcp";
  private static final int MCP_PORT = 32140;

  public DesignerMcpContainer(Path workspaceRoot, Path userData, String javaHome) {

    //super("mcr.microsoft.com/playwright:v1.54.2-noble");
    super(DockerImageName.parse("mcr.microsoft.com/playwright:v1.54.2-noble"));

    if (javaHome == null || javaHome.isBlank()) {
      throw new IllegalStateException("JAVA_HOME must be set to run designer-mcp container");
    }

    withWorkingDirectory("/workspace");
    
    configureContainerUser();
    System.out.println("Starting designer-mcp container with workspace root: " + workspaceRoot);
    withFileSystemBind(workspaceRoot.toString(), "/workspace", BindMode.READ_WRITE);
    withFileSystemBind(workspaceRoot.resolve("extension").toString(), 
      "/extension", BindMode.READ_ONLY);
    withFileSystemBind(userData.toString(),
      "/user-data", BindMode.READ_WRITE);
    withFileSystemBind(javaHome, javaHome, BindMode.READ_ONLY);
    withEnv("JAVA_HOME", javaHome);
    withExposedPorts(MCP_PORT);
    System.out.println("Waiting for MCP port " + MCP_PORT + " to be available in designer-mcp container...");
    waitingFor(Wait
        .forListeningPorts(MCP_PORT)
        .withStartupTimeout(Duration.ofSeconds(600)));

    withLogConsumer(new SysoutLogger(NETWORK_ALIAS));

    withCreateContainerCmdModifier(command -> command.withAliases(DesignerMcpContainer.NETWORK_ALIAS));
    withCommand(
        "bash", "-lc", ""
            + "aitest/mcp.sh vscode-designer.code-workspace\n"
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
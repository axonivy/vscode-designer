package ch.ivyteam.smart.core.copilot;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;

import com.github.dockerjava.api.exception.NotFoundException;

import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.images.builder.ImageFromDockerfile;

public class CopilotContainer extends GenericContainer<CopilotContainer> {

  private static final String IMAGE_NAME = "ivy-copilot:local";

  public CopilotContainer(String workspaceRoot) {
    super(copilotImage());
    withFileSystemBind(workspaceRoot, "/workspace", BindMode.READ_WRITE);
    withCommand("sleep", "infinity");
  }

  private static Future<String> copilotImage() {
    var dockerClient = DockerClientFactory.instance().client();
    try {
      dockerClient.inspectImageCmd(IMAGE_NAME).exec();
      return CompletableFuture.completedFuture(IMAGE_NAME);
    } catch (NotFoundException exception) {
      return new ImageFromDockerfile(IMAGE_NAME, false).withDockerfileFromBuilder(builder -> builder
          .from("node:24-slim")
          .run("apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*")
          .run("npm install -g @github/copilot")
          .build());
    }
  }
}

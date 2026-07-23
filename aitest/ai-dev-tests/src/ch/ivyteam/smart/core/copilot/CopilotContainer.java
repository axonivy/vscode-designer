package ch.ivyteam.smart.core.copilot;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.images.builder.ImageFromDockerfile;

public class CopilotContainer extends GenericContainer<CopilotContainer> {

  public CopilotContainer() {
    super(new ImageFromDockerfile().withDockerfileFromBuilder(builder -> builder
        .from("node:24-slim")
        .run("npm install -g @github/copilot")
        .build()));
    withExtraHost("host.docker.internal", "host-gateway");
    withCommand("sleep", "infinity");
  }
}

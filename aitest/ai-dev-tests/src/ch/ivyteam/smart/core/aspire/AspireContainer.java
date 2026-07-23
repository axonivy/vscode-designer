package ch.ivyteam.smart.core.aspire;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

public class AspireContainer extends GenericContainer<AspireContainer> {

  public AspireContainer() {
    super(DockerImageName.parse("mcr.microsoft.com/dotnet/aspire-dashboard:latest"));
    waitingFor(Wait.forLogMessage(".*Now listening on: http:\\/\\/\\[::\\]:18888.*", 1));
  }
}

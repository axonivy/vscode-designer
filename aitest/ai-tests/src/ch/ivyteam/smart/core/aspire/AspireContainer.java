package ch.ivyteam.smart.core.aspire;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

public class AspireContainer extends GenericContainer<AspireContainer> {

  public AspireContainer() {
    super(DockerImageName.parse("mcr.microsoft.com/dotnet/aspire-dashboard:latest"));
    withEnv("DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS", "true");
    withEnv("Dashboard__Api__Enabled", "true");
    withExposedPorts(18888, 18890);
    waitingFor(Wait.forLogMessage(".*Now listening on: http:\\/\\/\\[::\\]:18888.*", 1));
  }
}

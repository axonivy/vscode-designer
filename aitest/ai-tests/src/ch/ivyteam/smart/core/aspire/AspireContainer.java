package ch.ivyteam.smart.core.aspire;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import ch.ivyteam.smart.core.SysoutLogger;

public class AspireContainer extends GenericContainer<AspireContainer> {

  private static final String ALIAS = "aspire";

  public AspireContainer() {
    super(DockerImageName.parse("mcr.microsoft.com/dotnet/aspire-dashboard:latest"));
    withEnv("DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS", "true");
    withEnv("Dashboard__Api__Enabled", "true");
    withCreateContainerCmdModifier(command -> command.withAliases(ALIAS));
    withExposedPorts(18888, 18890);
    withLogConsumer(new SysoutLogger(ALIAS));
    waitingFor(Wait.forLogMessage(".*Now listening on: http:\\/\\/\\[::\\]:18888.*", 1));
  }

  public String getAspireEndpoint() {
    return "http://" + ALIAS + ":18890";
  }
}

package ch.ivyteam.smart.core;

import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.ParameterContext;
import org.junit.jupiter.api.extension.ParameterResolver;

public class AgentRuntimeExtension implements BeforeAllCallback, AfterAllCallback, ParameterResolver {
  private AgentRuntime runtime;

  @Override
  public void beforeAll(ExtensionContext context) {
    runtime = new AgentRuntime();
    runtime.start();
  }

  @Override
  public void afterAll(ExtensionContext context) {
    runtime.stop();
  }

  @Override
  public boolean supportsParameter(ParameterContext parameterContext, ExtensionContext extensionContext) {
    return parameterContext.getParameter().getType() == AgentRuntime.class;
  }

  @Override
  public Object resolveParameter(ParameterContext parameterContext, ExtensionContext extensionContext) {
    return runtime;
  }
}

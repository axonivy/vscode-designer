package ch.ivyteam.smart.core.copilot;

import java.nio.file.Path;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;

import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.images.builder.ImageFromDockerfile;

import com.github.dockerjava.api.exception.NotFoundException;
import ch.ivyteam.smart.core.docker.HostUser;

public class CopilotContainer extends GenericContainer<CopilotContainer> {

  private static final String IMAGE_NAME = "ivy-copilot:uid-compatible";

  public CopilotContainer(Path workspace, Path userData, Path skills) {
    super(copilotImage());
    HostUser.configure(this, "copilot");
    withFileSystemBind(workspace.toString(), "/workspace", BindMode.READ_WRITE);
    withFileSystemBind(userData.toString(), "/user-data", BindMode.READ_WRITE);
    withFileSystemBind(getCopilotCache(userData).toString(), "/home/copilot/.cache", BindMode.READ_WRITE);
    withFileSystemBind(skills.toString(), "/home/copilot/.copilot/skills", BindMode.READ_ONLY);
    withEnv("HOME", "/home/copilot");
    withEnv("COPILOT_AUTO_UPDATE", "false");
    withEnv("COPILOT_MODEL", "gpt-6-luna");
    withEnv("GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP", "true");
    withEnv("OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT", "true");
    authorize(this);
    withCommand("sleep", "infinity");
  }

  private static Path getCopilotCache(Path userData) {
    Path copilotCache = userData.resolve("copilot-cache");
    try {
      java.nio.file.Files.createDirectories(copilotCache);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to create Copilot cache directory", exception);
    }
    return copilotCache;
  }

  private static Future<String> copilotImage() {
    var dockerClient = DockerClientFactory.instance().client();
    try {
      dockerClient.inspectImageCmd(IMAGE_NAME).exec();
      return CompletableFuture.completedFuture(IMAGE_NAME);
    } catch (NotFoundException exception) {
      return new ImageFromDockerfile(IMAGE_NAME, false)
        .withDockerfileFromBuilder(builder -> builder
          .from("node:24.18-slim")
          .run("apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*")
            .run("COPILOT_AUTO_UPDATE=false npm install -g @github/copilot@1.0.80")
            .run("mkdir -p /home/copilot/.copilot && chmod -R 0777 /home/copilot")
          .build());
    }
  }

  private static void authorize(CopilotContainer copilot) {
    String openAiKey = System.getenv("OPENAI_API_KEY");
    if (openAiKey != null && !openAiKey.isBlank()) {
      System.out.println("Copilot in BYOM mode: using OpenAI API key from environment variable OPENAI_API_KEY");
      copilot
          .withEnv("COPILOT_PROVIDER_BASE_URL", "https://api.openai.com/v1")
          .withEnv("COPILOT_PROVIDER_WIRE_API", "responses")
          .withEnv("COPILOT_PROVIDER_API_KEY", openAiKey);
      return;
    }
    var copilotToken = copilotToken();
    if (copilotToken != null && !copilotToken.isBlank()) {
      System.out.println(
          "Copilot in GitHub mode: using GitHub token from environment variable COPILOT_TOKEN or GITHUB_TOKEN");
      copilot.withEnv("COPILOT_GITHUB_TOKEN", copilotToken);
      return;
    }
    throw new IllegalStateException("No OpenAI API key or GitHub token found in environment variables. \n" +
        "Please set OPENAI_API_KEY or COPILOT_TOKEN/GITHUB_TOKEN.");
  }

  private static String copilotToken() {
    String token = System.getenv("COPILOT_TOKEN");
    return token == null || token.isBlank() ? System.getenv("GITHUB_TOKEN") : token;
  }

}

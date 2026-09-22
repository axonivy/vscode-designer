package ch.ivyteam.smart.core.mcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;

public class IvyWorkspaceSetup {
  private final Path template;
  private final Path workspace;

  public IvyWorkspaceSetup(Path workspaceRoot) {
    template = workspaceRoot.resolve("aitest/ai-dev-tests/ivy-template");
    workspace = workspaceRoot.resolve("aitest/ai-dev-tests/ivy");
  }

  public Path initialize() {
    try {
      deleteFirstLevel();
      copyProjects();
      return workspace;
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to initialize Ivy workspace from: " + template, exception);
    }
  }

  private void deleteFirstLevel() throws IOException {
    Files.createDirectories(workspace);
    try (var paths = Files.list(workspace)) {
      paths
          .filter(path -> !path.getFileName().toString().equals(".gitignore"))
          .forEach(this::deleteRecursively);
    }
  }

  private void deleteRecursively(Path path) {
    try (var paths = Files.walk(path)) {
      paths.sorted(Comparator.reverseOrder()).forEach(this::delete);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to delete workspace path: " + path, exception);
    }
  }

  private void copyProjects() throws IOException {
    try (var projects = Files.list(template)) {
      projects.forEach(this::copyProject);
    }
  }

  private void copyProject(Path project) {
    try (var paths = Files.walk(project)) {
      paths.forEach(this::copy);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to copy project: " + project, exception);
    }
  }

  private void delete(Path path) {
    try {
      Files.delete(path);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to delete workspace path: " + path, exception);
    }
  }

  private void copy(Path source) {
    Path target = workspace.resolve(template.relativize(source));
    try {
      if (Files.isDirectory(source)) {
        Files.createDirectories(target);
      } else {
        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
      }
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to copy workspace path: " + source, exception);
    }
  }
}
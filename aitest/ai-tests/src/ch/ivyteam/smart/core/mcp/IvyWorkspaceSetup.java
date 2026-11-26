package ch.ivyteam.smart.core.mcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;

public class IvyWorkspaceSetup {
  private final Path template;
  private final Path fixtures;
  private final Path workspace;
  private boolean reuseWorkspace;

  public IvyWorkspaceSetup(Path workspaceRoot) {
    template = workspaceRoot.resolve("aitest/ai-dev-tests/ivy-template/purchase");
    fixtures = workspaceRoot.resolve("aitest/ai-dev-tests/ivy-fixtures");
    workspace = workspaceRoot.resolve("aitest/ai-dev-tests/ivy");
  }

  public Path initialize(boolean reuse) {
    try {
      var purchase = workspace.resolve("purchase");
      reuseWorkspace = reuse && Files.isDirectory(purchase);
      if (!reuse) {
        deleteFirstLevel();
      }
      if (!reuseWorkspace) {
        copyFixture(template, purchase, true);
      }
      return workspace;
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to initialize Ivy workspace from: " + template, exception);
    }
  }

  public void applyFixture(String testClassName, String testMethodName) {
    var overlay = fixtures.resolve(testClassName).resolve(testMethodName);
    if (!Files.isDirectory(overlay)) {
      return;
    }
    try {
      copyFixture(overlay, workspace, !reuseWorkspace);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to apply Ivy fixture from: " + overlay, exception);
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

  private void copyFixture(Path sourceRoot, Path targetRoot, boolean overwrite) throws IOException {
    try (var paths = Files.walk(sourceRoot)) {
      var iterator = paths.iterator();
      while (iterator.hasNext()) {
        var source = iterator.next();
        var target = targetRoot.resolve(sourceRoot.relativize(source));
        if (Files.isDirectory(source)) {
          Files.createDirectories(target);
        } else if (overwrite) {
          Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
        } else if (!Files.exists(target)) {
          Files.copy(source, target);
        }
      }
    }
  }

  private void delete(Path path) {
    try {
      Files.delete(path);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to delete workspace path: " + path, exception);
    }
  }
}
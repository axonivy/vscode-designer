package ch.ivyteam.smart.core.mcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class IvyWorkspace {
 
  private final Path workspace;

  public IvyWorkspace(Path workspace) {
    this.workspace = workspace;
  }

  public Path path(){
    return workspace;
  }

}

package ch.ivyteam.smart.core.mcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class IvyEngine {
  
  private final Path engineDir;

  public IvyEngine(Path engineDir) {
    this.engineDir = engineDir;
  }

  public String ivyLog() {
    var ivyLog = engineDir.resolve("logs").resolve("ivy.log");
    try {
      return Files.readString(ivyLog);
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

}

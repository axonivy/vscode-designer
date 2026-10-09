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

  public void clearLog() {
    var ivyLog = engineDir.resolve("logs").resolve("ivy.log");
    try {
      if (Files.exists(ivyLog)) {
        Files.writeString(ivyLog, "");
      }
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

  public String ivyLog() {
    var ivyLog = engineDir.resolve("logs").resolve("ivy.log");
    try {
      if (!Files.exists(ivyLog)) {
        return "";
      }
      return Files.readString(ivyLog);
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

}

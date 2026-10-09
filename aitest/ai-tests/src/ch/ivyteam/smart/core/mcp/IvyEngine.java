package ch.ivyteam.smart.core.mcp;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class IvyEngine {
  
  private final Path engineDir;
  private final Path logFile;
  private long logOffset = 0;

  public IvyEngine(Path engineDir) {
    this.engineDir = engineDir;
    this.logFile = engineDir.resolve("logs").resolve("ivy.log");
  }

  private Path existingLogFile() {
    if (!Files.exists(logFile)) {
      throw new IllegalStateException("Engine log file does not exist: " + logFile);
    }
    return logFile;
  }

  public void mark() {
    try {
      this.logOffset = Files.size(existingLogFile());
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

  public String newLogs() {
    var log = existingLogFile();
    try {
      long size = Files.size(log);
      if (size <= logOffset) {
        return "";
      }
      byte[] bytes = Files.readAllBytes(log);
      int offset = (int) Math.min(logOffset, bytes.length);
      return new String(bytes, offset, bytes.length - offset, StandardCharsets.UTF_8);
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

  public String ivyLog() {
    try {
      return Files.readString(existingLogFile());
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

}

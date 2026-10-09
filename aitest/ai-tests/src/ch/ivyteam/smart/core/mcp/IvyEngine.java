package ch.ivyteam.smart.core.mcp;

import java.io.IOException;
import java.io.UncheckedIOException;
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

  public void clearLog() {
    try {
      if (Files.exists(logFile)) {
        Files.writeString(logFile, "");
      }
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

  public void mark() {
    try {
      this.logOffset = Files.exists(logFile) ? Files.size(logFile) : 0;
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

  public String newLogs() {
    try {
      if (!Files.exists(logFile)) {
        return "";
      }
      long size = Files.size(logFile);
      if (size <= logOffset) {
        return "";
      }
      byte[] bytes = Files.readAllBytes(logFile);
      int offset = (int) Math.min(logOffset, bytes.length);
      return new String(bytes, offset, bytes.length - offset, java.nio.charset.StandardCharsets.UTF_8);
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

  public String ivyLog() {
    try {
      if (!Files.exists(logFile)) {
        return "";
      }
      return Files.readString(logFile);
    } catch (IOException ex) {
      throw new UncheckedIOException(ex);
    }
  }

}

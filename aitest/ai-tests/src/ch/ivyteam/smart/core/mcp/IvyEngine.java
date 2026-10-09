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

  private long logOffset = 0;

  public void mark() {
    var ivyLog = engineDir.resolve("logs").resolve("ivy.log");
    try {
      this.logOffset = Files.exists(ivyLog) ? Files.size(ivyLog) : 0;
    } catch (IOException ex) {
      this.logOffset = 0;
    }
  }

  public String newLogs() {
    var ivyLog = engineDir.resolve("logs").resolve("ivy.log");
    try {
      if (!Files.exists(ivyLog)) {
        return "";
      }
      long size = Files.size(ivyLog);
      if (size <= logOffset) {
        return "";
      }
      byte[] bytes = Files.readAllBytes(ivyLog);
      int offset = (int) Math.min(logOffset, bytes.length);
      return new String(bytes, offset, bytes.length - offset, java.nio.charset.StandardCharsets.UTF_8);
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

package ch.ivyteam.smart.core.copilot;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import java.util.stream.Collectors;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

final class AiUtils {

  private AiUtils() {
  }

  static Path findFile(Path dir, String fileName) throws IOException {
    try (var files = Files.walk(dir)) {
      return files.filter(f -> f.getFileName().toString().equals(fileName))
          .findFirst().orElseThrow(() -> new IllegalStateException(fileName + " not found in " + dir));
    }
  }

  static JsonNode readJson(Path file) throws IOException {
    try (var in = Files.newInputStream(file)) {
      return JsonMapper.shared().readTree(in);
    }
  }
}
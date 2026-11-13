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

  static void assertUserFields(Path dataClass) throws IOException {
    var dataJson = readJson(dataClass);
    var fieldTypes = dataJson.path("fields").valueStream()
        .collect(Collectors.toMap(f -> f.path("name").asString(), f -> f.path("type").asString()));

    assertThat(fieldTypes).containsKeys("fullName", "address", "phone", "age");
    assertThat(fieldTypes.get("fullName"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("address"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("phone"))
        .isIn("", "String", "java.lang.String");
    assertThat(fieldTypes.get("age"))
        .matches("Number|java\\.lang\\.(Number|Integer|Long)");
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
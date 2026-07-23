package ch.ivyteam.smart.core.telemetry;

import static io.opentelemetry.semconv.incubating.GenAiIncubatingAttributes.GEN_AI_USAGE_INPUT_TOKENS;
import static io.opentelemetry.semconv.incubating.GenAiIncubatingAttributes.GEN_AI_USAGE_OUTPUT_TOKENS;

import io.opentelemetry.api.common.AttributeKey;

import tools.jackson.databind.JsonNode;

public class TelemetryUtils {

  public static record TokenUsage(int input, int output) {}

  public static TokenUsage tokenUsage(JsonNode spans) {
    var rootSpan = rootSpan(spans);
    var inputTokens = findSpanAttributeValue(rootSpan, GEN_AI_USAGE_INPUT_TOKENS);
    var outputTokens = findSpanAttributeValue(rootSpan, GEN_AI_USAGE_OUTPUT_TOKENS);
    return new TokenUsage(Integer.parseInt(inputTokens), Integer.parseInt(outputTokens));
  }

  private static JsonNode rootSpan(JsonNode spans) {
    var rootSpans = spans.valueStream()
        .filter(span -> !span.has("parentSpanId"))
        .toList();
    if (rootSpans.size() > 1) {
      throw new IllegalStateException("Expected only one root span, but found " + rootSpans.size() + ". Spans: " + spans);
    }
    return rootSpans.get(0);
  }

  private static String findSpanAttributeValue(JsonNode span, AttributeKey<?> key) {
    var attribute = span.get("attributes").valueStream()
        .filter(attr -> key.getKey().equals(attr.get("key").asString()))
        .findAny().orElse(null);
    if (attribute == null) {
      return null;
    }
    return attribute.get("value").get("stringValue").asString();
  }
}

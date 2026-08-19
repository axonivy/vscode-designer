package ch.ivyteam.smart.core.aspire;

import static io.opentelemetry.semconv.incubating.GenAiIncubatingAttributes.GEN_AI_USAGE_INPUT_TOKENS;
import static io.opentelemetry.semconv.incubating.GenAiIncubatingAttributes.GEN_AI_USAGE_OUTPUT_TOKENS;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import io.opentelemetry.api.common.AttributeKey;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

public class AspireSpans {

  static final ObjectMapper MAPPER = new ObjectMapper();

  private ArrayNode spans;

  public static AspireSpans of(String spans) {
    try {
      var inlineSpans = MAPPER.readTree(spans)
        .get("data")
        .get("resourceSpans").get(0)
        .get("scopeSpans").get(0)
        .get("spans");
      return new AspireSpans(inlineSpans);
    } catch (Exception ex) {
      throw new RuntimeException("Failed to parse spans", ex);
    }
  }

  public AspireSpans(JsonNode spans) {
    this.spans = (ArrayNode) spans;
  }

  public TokenUsage tokenUsage() {
    var rootSpan = rootSpan(spans);
    var inputTokens = findSpanAttributeIntValue(rootSpan, GEN_AI_USAGE_INPUT_TOKENS)
      .orElseThrow(() -> new IllegalStateException("Missing attribute "+ GEN_AI_USAGE_INPUT_TOKENS.getKey() +" in root span"));
    var outputTokens = findSpanAttributeIntValue(rootSpan, GEN_AI_USAGE_OUTPUT_TOKENS)
      .orElseThrow(() -> new IllegalStateException("Missing attribute "+ GEN_AI_USAGE_OUTPUT_TOKENS.getKey() +" in root span"));
    return new TokenUsage(inputTokens, outputTokens);
  }
  
  public static record TokenUsage(int input, int output) {}
  
  public Tools tools() {
    var rootSpan = rootSpan(spans);
    var toolsNode = findSpanAttributeValue(rootSpan, AttributeKey.stringKey("gen_ai.tool.definitions"))
      .map(s -> {
        try {
          return (ArrayNode) MAPPER.readTree(s);
        } catch (Exception ex) {
          throw new RuntimeException("Failed to parse tools", ex);
        }
      })
      .orElseThrow(() -> new IllegalStateException("No gen_ai.tool.definitions attribute found in root span"));
    return new Tools(toolsNode);
  }

  public static record Tools(ArrayNode tools) {

    public List<String> names() {
      return tools.elements().stream()
          .map(e -> e.get("name").asString())
          .toList();
    }

  }

  public List<UsedTool> usedTools() {
    return childSpans()
      .filter(span -> findSpanAttributeValue(span, AttributeKey.stringKey("gen_ai.tool.name")).isPresent())
      .map(UsedTool::new)
      .toList();
  }

  private Stream<JsonNode> childSpans() {
    var rootSpan = rootSpan(spans);
    var id = rootSpan.get("spanId").asString();
    return spans.valueStream()
      .filter(span -> id.equals(parentSpanId(span)));
  }

  private static String parentSpanId(JsonNode span) {
    JsonNode parent = span.get("parentSpanId");
    if (parent == null) {
      return null;
    }
    return parent.asString();
  }

  public static record UsedTool(JsonNode span) {
    
    public String name() {
      return findSpanAttributeValue(span, AttributeKey.stringKey("gen_ai.tool.name")).get();
    }
  }

  private static ObjectNode rootSpan(JsonNode spans) {
    var rootSpans = spans.valueStream()
        .filter(ObjectNode.class::isInstance)
        .map(ObjectNode.class::cast)
        .filter(span -> !span.has("parentSpanId"))
        .toList();
    return rootSpans.get(rootSpans.size() - 1);
  }

  private static Optional<String> findSpanAttributeValue(JsonNode span, AttributeKey<?> key) {
    var attribute = span.get("attributes").valueStream()
        .filter(attr -> key.getKey().equals(attr.get("key").asString()))
        .findAny().orElse(null);
    if (attribute == null) {
      return Optional.empty();
    }
    return Optional.of(attribute.get("value").get("stringValue").asString());
  }

  private static Optional<Integer> findSpanAttributeIntValue(JsonNode span, AttributeKey<?> key) {
    return findSpanAttributeValue(span, key).map(val -> {
      try {
        return Integer.parseInt(val);
      } catch (NumberFormatException ex) {
        throw new RuntimeException("Failed to parse integer attribute " + key.getKey(), ex);
      }
    });
  }
}

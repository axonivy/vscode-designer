package ch.ivyteam.smart.core.aspire;

import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.WebTarget;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class AspireAPI {

  private final WebTarget target;
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private AspireAPI(WebTarget target) {
    this.target = target;
  }

  public JsonNode spansOfResource(String resource) {
    var request = target
        .path("spans")
        .queryParam("resource", resource)
        .request();
    try (var response = request.get()) {
      var json = response.readEntity(String.class);
      var span = MAPPER.readTree(json);
      System.out.println("Spans of resource " + resource + ": " + span.toPrettyString());
      return span
          .get("data")
          .get("resourceSpans").get(0)
          .get("scopeSpans").get(0)
          .get("spans");
    } catch (Exception ex) {
      throw new RuntimeException(ex);
    }
  }

  public static AspireAPI create(String baseUrl) {
    WebTarget path = ClientBuilder.newClient()
        .target(baseUrl)
        .path("api")
        .path("telemetry");
    return new AspireAPI(path);
  }

  @Override
  public String toString() {
    return target.getUri().toString();
  }
}

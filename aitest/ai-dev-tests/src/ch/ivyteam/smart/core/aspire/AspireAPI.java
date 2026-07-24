package ch.ivyteam.smart.core.aspire;

import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.WebTarget;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class AspireAPI {

  private final WebTarget target;

  private final static ObjectMapper MAPPER = new ObjectMapper();

  private AspireAPI(WebTarget target) {
    this.target = target;
  }

  public JsonNode spansOfResource(String resource) {
    var request = target
        .path("spans")
        .queryParam("resource", resource)
        .request();
    try (var response = request.get()) {
      var raw = response.readEntity(String.class);
      return MAPPER.readTree(raw)
          .get("data")
          .get("resourceSpans").get(0)
          .get("scopeSpans").get(0)
          .get("spans");
    }
  }

  public static AspireAPI create(String baseUrl) {
    return new AspireAPI(
        ClientBuilder.newClient()
            .target(baseUrl)
            .path("api")
            .path("telemetry"));
  }

  @Override
  public String toString() {
    return target.getUri().toString();
  }
}

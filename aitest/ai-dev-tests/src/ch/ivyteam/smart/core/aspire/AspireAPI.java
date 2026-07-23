package ch.ivyteam.smart.core.aspire;

import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.WebTarget;

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
      return MAPPER.readTree(response.readEntity(String.class))
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
}

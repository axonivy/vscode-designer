package ch.ivyteam.smart.core.aspire;

import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.client.WebTarget;
import tools.jackson.databind.JsonNode;

public class AspireAPI {

  private final WebTarget target;

  private AspireAPI(WebTarget target) {
    this.target = target;
  }

  public JsonNode spansOfResource(String resource) {
    var request = target
        .path("spans")
        .queryParam("resource", resource)
        .request();
    try (var response = request.get()) {
      var span = response.readEntity(JsonNode.class);
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

package ch.ivyteam.smart.core.copilot;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.xml.sax.SAXException;

class PomParser {

  static List<Dependency> dependencies(Path pom) {
    try {
      var pomDocument = loadDocument(pom);
      var dependencyElements = pomDocument.getElementsByTagName("dependency");
      var dependencies = new ArrayList<Dependency>();
      for (var dependencyIndex = 0; dependencyIndex < dependencyElements.getLength(); dependencyIndex++) {
        var dependency = (Element) dependencyElements.item(dependencyIndex);
        dependencies.add(new Dependency(
            childText(dependency, "groupId"),
            childText(dependency, "artifactId"),
            childText(dependency, "version"),
            childText(dependency, "type")));
      }
      return dependencies;
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse POM: " + pom, e);
    }
  }

  private static Document loadDocument(Path pom) throws ParserConfigurationException, SAXException, IOException {
    var pomParser = DocumentBuilderFactory.newInstance();
    pomParser.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    pomParser.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    pomParser.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
    var pomDocument = pomParser.newDocumentBuilder().parse(pom.toFile());
    return pomDocument;
  }

  private static String childText(Element parent, String tagName) {
    var child = parent.getElementsByTagName(tagName).item(0);
    return child == null ? "" : child.getTextContent().trim();
  }

  record Dependency(String groupId, String artifactId, String version, String type) {
  }
}

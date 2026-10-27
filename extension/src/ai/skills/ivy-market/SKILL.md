---
name: ivy-market
description: 'MUST use to search for or install Axon Ivy Market products, including connectors, utilities, solutions, and demos'
user-invocable: false
---

# Market Extensions

## Search

Use a `web` tool to fetch the complete product listing; do not cap or truncate it:
https://market.axonivy.com/stable/api/product
Use the exact product `id` from the listing; never guess.

## Install

For installs, fetch the complete listing and use its exact product `id`. Resolve the matching version, then call:
`GET https://market.axonivy.com/stable/api/product-details/${productId}/${ivyVersion}/bestmatch?isShowDevVersion=true`
Use the returned `version` as `productVersion` in one install call:
`GET https://market.axonivy.com/stable/api/product/${productId}/install?productVersion=${productVersion}`

If either API call fails, report it; do not guess versions or coordinates.

1. Inspect the target project's `pom.xml` and read the Ivy version from its `ivy-project-parent`; ask if the project is ambiguous.
2. Read `maven-dependency` installer data using `schema/market/product.json`. Select required dependencies, only the requested member(s) of each `requireOneOfGroup`, and optional standalone add-ons only when requested. Ask if a group choice is unspecified.
3. Edit the existing POM: add selected dependencies directly under `<dependencies>` with their exact coordinates, and add missing installer repositories. Preserve unrelated XML.


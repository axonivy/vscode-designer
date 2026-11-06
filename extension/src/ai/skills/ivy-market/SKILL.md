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

## Importing demos

Only import a demo/source project when the user explicitly asks for it in the workspace. Inspect the product's `maven-import` installer and have the user name each project they want by its exact `artifactId`; ask if an artifact is missing or ambiguous. Never infer the selection from `importInWorkspace` values or other defaults. Fetch the complete install response using the Market listing's product ID, then call `axonivy-designer-import_market_product` with `productId` set to an array of the named artifactIds (including a one-item array for a single project) and the complete `product.json`. The tool imports only those matching `maven-import` projects through the Axon Ivy Engine market installer, even if selected projects are marked `importInWorkspace: false`. Do not use shell commands to download or unpack artifacts. Wait for tool success and verify each imported project's `.ivyproject` and `pom.xml`; product-only installs do not import advertised demos.

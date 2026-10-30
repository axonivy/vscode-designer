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

Use `web_fetch` for the listing and both Marketplace API calls. Use `bash`/Maven only to resolve and extract IAR artifacts.

If `web_fetch` is unavailable, use one `bash`/`curl` request per API URL.

For installs, fetch the listing and use its exact product `id`. Read the Ivy version from the target project's `ivy-project-parent`, then call:
`GET https://market.axonivy.com/stable/api/product-details/${productId}/${ivyVersion}/bestmatch?isShowDevVersion=true`
Use the returned `version` as `productVersion` in one install call:
`GET https://market.axonivy.com/stable/api/product/${productId}/install?productVersion=${productVersion}`

If either API call fails, report it; do not guess versions or coordinates.

1. Inspect the target project and ask if it is ambiguous.
2. Read `maven-dependency` data using `schema/market/product.json`. Select required dependencies, requested group entries, and optional standalone add-ons only when requested.
3. Add selected dependencies directly under `<dependencies>` with their exact coordinates and add missing repositories. Preserve unrelated XML; reread the POM to verify before claiming success.

## Source project imports

For each `maven-import` installer, import projects in `data.projects` unless `importInWorkspace` is false (boolean or string); a missing value means true. These are IAR source projects, not dependencies to add to the consuming POM.

Resolve the IAR with Maven using `-Dartifact=${groupId}:${artifactId}:${version}:iar`, `-Dtransitive=false`, and the installer's repository URL so snapshot metadata is honored. Extract only `META-INF/ivy/*`, strip the prefix, and place it in a workspace folder named for `artifactId`; do not unpack the rest of the archive. Verify `.ivyproject` and project sources are present.

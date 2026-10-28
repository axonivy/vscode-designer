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

For every install request, fetch the listing first, then use `web` to GET the install endpoint with that product's `id`. If `web` is unavailable, report that; do not claim installation.
https://market.axonivy.com/stable/api/product/${productId}/install

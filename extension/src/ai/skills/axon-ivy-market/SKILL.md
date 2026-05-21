---
name: axon-ivy-market
description: 'Search for and install products from the Axon Ivy Market. Use when the user wants to find connectors, utilities, solutions, or demos, or wants to add a market product as a Maven dependency to their Axon Ivy project.'
argument-hint: 'product name or keyword to search for'
---

# Axon Ivy Market

The Axon Ivy Market provides connectors, utilities, solutions, and demos installable as Maven dependencies into Axon Ivy projects.
Fetch the full REST API spec from `https://market.axonivy.com/stable/api-docs` for endpoint details.

## Workflow

1. **Search for products**: Fetch products matching the user's intent. If necessary, present the matches to the user and confirm which product to install.
2. **Determine the product version**: Fetch compatible product versions and pick the latest compatible version.
3. **Install**: Fetch the product's installation details to install it.

## Axon Ivy PRO Designer

Axon Ivy PRO Designer is the official Visual Studio Code extension for developing powerful business applications with the Axon Ivy Platform. It provides all the tools you need to design, automate, and optimize workflows from simple tasks to complex enterprise processes. The PRO Designer combines intuitive visual modeling with the flexibility of advanced development tools, offering a unified environment for process orchestration and application development.

## Setup

This extension can be used locally or in a [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers). Different installations are required for the two options, see below.
[Or simply start by cloning our demo-projects repository into your GitHub codespace.](https://github.com/codespaces/new/axonivy/demo-projects)

### Local usage

Make sure that **Java SE 25** and **Maven 3** are installed on your machine.
You may want to use Java SE 25 provided by your operating system or install [Eclipse Temurin](https://adoptium.net/).

The first time the extension is launched, an Axon Ivy Engine is automatically downloaded in the background. The download is displayed in the lower right corner.
Advanced users may wish to specify the Axon Ivy Engine release train. To do so, execute the command **Axon Ivy: Switch Engine release train**.

### Dev Container

Make sure that [Dev Container extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) and **Docker** are installed.

1. Run **Axon Ivy: Add Dev Container** command to add the required configuration files for the Dev Container to your workspace.
2. Run **Dev Containers: Rebuild and Reopen in Container** command

See how it works:
![Launch Dev Container](extension/assets/readme/launch-container.gif)

## Getting started

### From scratch

- Add Axon Ivy Project
- Create Business Process and extend it
- Add Html Dialog
- Preview Process

See how it works:
![Add Project](extension/assets/readme/add-project.gif)

### With existing project

When you open an existing project for the first time, e.g. [demo-projects](https://github.com/axonivy/demo-projects), initially run **Build and Deploy all Projects** command.

See how it works:
![Build and Deploy](extension/assets/readme/build-and-deploy.gif)

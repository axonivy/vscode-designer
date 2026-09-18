# Axon Ivy PRO Designer

**Axon Ivy PRO Designer** is the official Visual Studio Code extension for developing powerful business applications with the Axon Ivy Platform. It provides everything you need to design, automate, and optimize workflows from simple tasks to complex enterprise processes.

The PRO Designer combines intuitive visual modeling with the flexibility of advanced development tools, providing a unified environment for process orchestration and application development.

The sections below provide setup and getting started instructions to help you get up and running quickly. For more detailed information, please refer to our [official documentation](https://dev.axonivy.com/doc/14.0/en/designer/index.html).

## Setup

This extension can be used locally or in a [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers). Different installations are required for the two options, see below.

### Local usage

Make sure that **Java Development Kit (JDK) 25** and **Maven 3.9** are installed on your machine.
You may want to use JDK 25 provided by your operating system or install [Eclipse Temurin](https://adoptium.net/).

After installing the extension and launching it for the first time, an Axon Ivy Engine is automatically downloaded in the background. The download progress is displayed in the lower-right corner.
Advanced users may wish to specify the Axon Ivy Engine release train. To do so, execute the command **Axon Ivy: Switch Engine release train**.

### Dev Container

In addition to our extension, make sure the [Dev Container extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) and **Docker** are installed. The first time you start the Dev Container, it may take some time while the container environment is set up.

1. Run the **Axon Ivy: Add Dev Container** command to add the required Dev Container configuration file to your workspace.
2. Run the **Dev Containers: Reopen in Container** command to open your workspace inside the Dev Container.

## Getting started

### From scratch

- Add an **Axon Ivy Project**
- Create a **Business Process** and add a **User Dialog** activity
- Create a **Form Dialog** with an input field
- Start **Process Preview**

See how it works:
![Add Project](extension/assets/readme/add-project.gif)

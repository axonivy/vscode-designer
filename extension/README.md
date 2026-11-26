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

## Dependency sources and Javadoc

If Java hover or completion documentation is missing, run **Axon Ivy: Download Dependency Sources**, use an Ivy project's context menu, or click **Download dependency sources for this Ivy project** in the process editor's missing-Javadoc hint.

The command runs Maven's `dependency:sources` goal for that project's `pom.xml`. It uses the Maven extension's executable, wrapper, settings and profiles, and does not force snapshot updates (`-U`). Automatic source downloading at startup remains unchanged.

When Maven exits successfully, only the affected Java project's configuration is refreshed to attach the downloaded sources. No Java cache clean or window reload is needed. Wait for Java to finish updating, then reopen hover or completion. If terminal shell integration cannot report completion, select **Maven finished: Refresh Java** in the notification after Maven finishes. **Stop tracking** stops automatic refresh tracking, not the Maven process.

Maven and Java must use the same local repository and compatible settings (`maven.settingsFile` and `java.configuration.maven.userSettings` / `java.configuration.maven.globalSettings`). Some dependencies do not publish sources; project configuration refresh requires Java's Standard mode.

## Getting started

### From scratch

- Add an **Axon Ivy Project**
- Create a **Business Process** and add a **User Dialog** activity
- Create a **Form Dialog** with an input field
- Start **Process Preview**

See how it works:
![Add Project](extension/assets/readme/add-project.gif)

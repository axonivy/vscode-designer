FROM mcr.microsoft.com/playwright:v1.58.2

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.32.1

RUN apt-get update &&\
  apt-get install software-properties-common -y &&\
  apt-add-repository universe -y &&\
  apt-get update &&\
  apt-get install openjdk-25-jdk -y

ARG MAVEN_VERSION=3.9.14
ARG BASE_URL=https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries

RUN mkdir -p /usr/share/maven /usr/share/maven/ref \
  && curl -fsSL -o /tmp/apache-maven.tar.gz ${BASE_URL}/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
  && tar -xzf /tmp/apache-maven.tar.gz -C /usr/share/maven --strip-components=1 \
  && rm -f /tmp/apache-maven.tar.gz \
  && ln -s /usr/share/maven/bin/mvn /usr/bin/mvn

ENV JAVA_HOME=/usr/lib/jvm/java-25-openjdk-amd64
ENV JAVA_OPTS_IVY_SYSTEM="-Ddev.mode=true -Divy.engine.testheadless=true"
ENV CI=true
ENV RUN_IN_BROWSER=true

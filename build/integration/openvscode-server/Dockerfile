FROM mcr.microsoft.com/playwright:v1.58.2

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.29.3

RUN apt-get update &&\
  apt-get install software-properties-common -y &&\
  apt-add-repository universe -y &&\
  apt-get update &&\
  apt-get install openjdk-21-jdk -y

ENV JAVA_OPTS_IVY_SYSTEM="-Ddev.mode=true -Divy.engine.testheadless=true"
ENV CI=true
ENV RUN_IN_BROWSER=true

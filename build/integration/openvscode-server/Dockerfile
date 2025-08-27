FROM mcr.microsoft.com/playwright:v1.55.0

RUN apt-get update &&\
  apt-get install software-properties-common -y &&\
  apt-add-repository universe -y &&\
  apt-get update &&\
  apt-get install openjdk-21-jdk -y

ENV JAVA_OPTS_IVY_SYSTEM=-Divy.engine.testheadless=true
ENV CI=true
ENV RUN_IN_BROWSER=true

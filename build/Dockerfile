FROM node:24.16-bookworm

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN npm install -g pnpm@11.2.2

USER node

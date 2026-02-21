FROM node:24.13-bookworm

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN npm install -g pnpm@10.30.0

USER node

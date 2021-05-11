# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.168.0/containers/javascript-node/.devcontainer/base.Dockerfile
ARG VARIANT="14-buster"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

RUN su node -c "npm install -g yarn"
RUN su node -c "yarn install"

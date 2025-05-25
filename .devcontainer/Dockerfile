FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends git-lfs \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install global node packages
RUN su node -c "npm install -g npm@latest"

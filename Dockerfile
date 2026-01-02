FROM node:22-slim

# Install Python (GramJS needs it for crypto)
RUN apt-get update && apt-get install -y python3 python3-pip \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY src ./src
COPY tsconfig.json ./
COPY scripts ./scripts

# Build TypeScript - this creates the dist folder
RUN npm run build

# Verify the build output exists
RUN ls -la dist/

CMD ["node", "dist/main.js"]
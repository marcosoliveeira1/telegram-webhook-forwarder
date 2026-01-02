FROM node:22-slim

# Install Python (GramJS needs it for crypto) and curl for healthcheck
RUN apt-get update && apt-get install -y python3 python3-pip curl \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Port for health check
EXPOSE 3000

CMD ["node", "dist/main.js"]
# October Rally 2026 — production image (local SQLite file on a mounted volume).
# For the serverless path, set TURSO_* + BLOB_READ_WRITE_TOKEN instead and deploy
# to Vercel — no container needed.
FROM node:22-bookworm-slim

WORKDIR /app

# Toolchain in case any native dep (e.g. libSQL bindings) needs to compile.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies against the committed lockfile first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci

# Build the app.
COPY . .
ENV NODE_ENV=production
RUN npm run build

# The SQLite DB, uploads, and backups live here — mount a persistent volume.
ENV RALLY_DATA_DIR=/data
VOLUME ["/data"]

# Honour the platform's $PORT (falls back to 3100). See the "start" script.
ENV PORT=3100
EXPOSE 3100

CMD ["npm", "start"]

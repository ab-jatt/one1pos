# ============================================================
# Stage 1: Builder — install deps, bake VITE_API_URL, build bundle
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ── Layer 1: dependencies (cached unless package.json changes) ─
COPY package*.json ./
RUN npm ci

# VITE_API_URL is baked into the JS bundle at build time by Vite.
# It must point to the URL reachable from the USER'S BROWSER,
# not from inside Docker (which is why we use localhost:8081, not
# the internal Docker service name "backend").
# /api suffix is required — NestJS uses app.setGlobalPrefix('api').
ARG VITE_API_URL=http://localhost:8081/api
ENV VITE_API_URL=$VITE_API_URL

# ── Layer 2: source compile ────────────────────────────────────
COPY . .
RUN npm run build

# ============================================================
# Stage 2: Serve with Nginx — no Node.js at runtime (~25 MB image)
# ============================================================
FROM nginx:1.27-alpine AS production

# curl is needed for the Docker HEALTHCHECK.
# nginx:alpine is a minimal image that does NOT ship wget/curl by default.
RUN apk add --no-cache curl

# Remove the default server block
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config (SPA fallback + gzip + cache headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled Vite bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Run nginx as a non-root user (nginx image ships with the 'nginx' user)
# Bind to unprivileged port 8080 inside the container and let docker-compose
# map it to host port 5173 — OR keep port 80; the image uses port 80 here
# for simplicity since port mapping is handled by docker-compose.
EXPOSE 80

# Health check — hits the dedicated /health stub return (no filesystem I/O).
# curl -f returns exit code 22 on HTTP 4xx/5xx, so Docker correctly detects errors.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ============================================================
# Stage 1: Builder — install all deps, generate Prisma client,
#                    compile TypeScript
# ============================================================
FROM node:20-alpine AS builder

# openssl: needed by the Prisma query-engine binary on Alpine (musl)
RUN apk add --no-cache openssl

WORKDIR /app

# ── Layer 1: dependencies (cached unless package.json changes) ─
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (devDeps are required for NestJS CLI build)
RUN npm ci

# Generate Prisma client targeting Alpine (linux-musl-openssl-3.0.x)
# binaryTargets are declared in prisma/schema.prisma
RUN npx prisma generate

# ── Layer 2: source compile ────────────────────────────────────
COPY . .
RUN npm run build

# Pre-compile seed.ts → seed.js so the production image can run it
# with plain `node` — no ts-node or TypeScript needed at runtime.
# TypeScript's programmatic API is available because it's a devDependency
# already installed by `npm ci` above.
RUN node -e "var ts=require('./node_modules/typescript'),fs=require('fs');var src=fs.readFileSync('prisma/seed.ts','utf8');var out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2020,strict:false}});fs.writeFileSync('prisma/seed.js',out.outputText);console.log('seed.ts compiled to prisma/seed.js');"

# ============================================================
# Stage 2: Production — lean runtime image
# ============================================================
FROM node:20-alpine AS production

# dumb-init: acts as PID 1, forwards signals properly so Node.js
#            shuts down gracefully on `docker stop` / SIGTERM
# openssl:   required by the Prisma query-engine binary at runtime
RUN apk add --no-cache dumb-init openssl

# Create a non-root user/group for running the app
RUN addgroup -S nestjs && adduser -S -G nestjs nestjs

WORKDIR /app

# ── Prod-only node_modules ─────────────────────────────────────
COPY package*.json ./
COPY prisma ./prisma/

# Install runtime dependencies only.
#
# WHY --ignore-scripts:
#   @prisma/client ships a postinstall hook that runs `prisma generate`.
#   In this stage `prisma` CLI is a devDependency (omitted), so that hook
#   would fail with "prisma: not found".  We skip it here and instead copy
#   the already-generated client from the builder stage below.
#
# WHY npm install instead of npm ci:
#   npm ci enforces strict lockfile integrity checks and aborts on any
#   deviation; npm install is more tolerant and re-creates the lockfile
#   if needed — making it more reliable inside Docker layer cache.
RUN npm install --omit=dev --ignore-scripts

# ── Pull artefacts from builder ────────────────────────────────
# 1. Pre-generated Prisma client (correct musl binary, no regeneration needed)
COPY --from=builder /app/node_modules/.prisma        ./node_modules/.prisma
# 2. Prisma CLI package — needed to run `prisma migrate deploy` at startup
COPY --from=builder /app/node_modules/prisma         ./node_modules/prisma
# 3. Prisma CLI bin shim (the executable script in .bin)
COPY --from=builder /app/node_modules/.bin/prisma    ./node_modules/.bin/prisma
# 4. Compiled TypeScript output
COPY --from=builder /app/dist ./dist
# 5. Pre-compiled seed script — plain JS, no ts-node required at runtime
COPY --from=builder /app/prisma/seed.js              ./prisma/seed.js
# 6. tsconfig.json (optional, kept for any tooling that inspects it)
COPY --from=builder /app/tsconfig.json               ./tsconfig.json

# Transfer ownership to the runtime user.
#
# We deliberately avoid `chown -R nestjs:nestjs /app` because recursing into
# all of node_modules (~300 MB) causes an I/O-RPC timeout in Docker Desktop
# on Windows.  Instead we target only what actually needs to be writable:
#
#   • /app/dist, /app/prisma, configs  — app artefacts
#   • /app/node_modules/.prisma        — generated binary client (written at build, read at runtime)
#   • /app/node_modules/@prisma        — Prisma engine binaries; Prisma writes a
#                                        lock / extraction marker here on first boot
#   • /app/node_modules/prisma         — Prisma CLI (migrate deploy reads it)
#   • /app/node_modules/.bin/prisma    — CLI shim
#
# All other node_modules entries are read-only at runtime and can remain root-owned.
RUN chown -R nestjs:nestjs \
      /app/dist \
      /app/prisma \
      /app/package.json \
      /app/package-lock.json \
      /app/tsconfig.json \
      /app/node_modules/.prisma \
      /app/node_modules/@prisma \
      /app/node_modules/prisma \
      /app/node_modules/.bin/prisma

# Drop privileges — never run Node.js as root in production
USER nestjs

EXPOSE 8080

# Docker-native health check.
# --start-period gives the app time to boot before Docker counts failures.
# wget ships with busybox on Alpine; no extra install needed.
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# dumb-init handles PID-1 duties; migrations run before the server starts.
# node_modules/.bin/prisma avoids relying on `npx` (which needs internet).
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]

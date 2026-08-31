# ---------- Base ----------
# Pinned patch version for reproducible CI builds (bump deliberately)
FROM node:24.8.0-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH" \
    CI=1
    
# Install pnpm directly instead of corepack (deprecated; signature issues on older versions)
RUN npm install -g pnpm@10.18.3
WORKDIR /app

# ---------- Dependencies (all, for build) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Production dependencies (slim, for runtime) ----------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate \
 && pnpm build
 
# ---------- Runtime ----------
FROM node:24.8.0-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Run as non-root
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
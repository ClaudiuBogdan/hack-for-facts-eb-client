# syntax=docker/dockerfile:1

FROM node:24-slim AS build
ARG SENTRY_SOURCEMAPS=false
ARG VITE_APP_VERSION
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
COPY docs-site/package.json docs-site/yarn.lock ./docs-site/
RUN yarn install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV SENTRY_SOURCEMAPS=${SENTRY_SOURCEMAPS}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

RUN mkdir -p /tmp/sentry-artifacts
RUN yarn build:app
RUN yarn build:validate
RUN if [ "${SENTRY_SOURCEMAPS}" = "true" ]; then \
    yarn sentry:prepare-artifacts; \
    yarn sentry:validate-debug-ids; \
    find .output -name "*.map" -type f -delete; \
    yarn build:validate; \
  fi

FROM node:24-alpine AS run
WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV YARN_CACHE_FOLDER=/tmp/.yarn-cache

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY package.json yarn.lock ./
# Standard Node runtime packaging: install production dependencies in the
# runtime image so native optional dependencies (like @resvg bindings) resolve.
# Ignore lifecycle scripts to avoid running app-level postinstall in the runtime image.
RUN yarn install --frozen-lockfile --production=true --ignore-scripts \
  && yarn cache clean --all \
  && rm -rf "${YARN_CACHE_FOLDER}"

COPY --from=build --chown=nodejs:nodejs /app/.output ./.output
COPY --from=build --chown=nodejs:nodejs /tmp/sentry-artifacts ./sentry-artifacts

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]

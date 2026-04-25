# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
COPY docs-site/package.json docs-site/yarn.lock ./docs-site/
RUN yarn install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ARG SENTRY_SOURCEMAPS=false
ENV SENTRY_SOURCEMAPS=${SENTRY_SOURCEMAPS}

RUN yarn build:app
RUN if [ "${SENTRY_SOURCEMAPS}" = "true" ]; then \
  ./node_modules/.bin/sentry-cli sourcemaps inject .output/public/assets; \
fi
RUN test -f .output/server/index.mjs

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

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]

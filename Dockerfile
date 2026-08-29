# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build

WORKDIR /app

ARG COMMIT_SHA=unknown
ENV NUXT_TELEMETRY_DISABLED=1 \
    NUXT_PUBLIC_BUILD_ID=$COMMIT_SHA

COPY package.json ./
RUN npm install --include=optional

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ARG COMMIT_SHA=unknown
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1 \
    COMMIT_SHA=$COMMIT_SHA

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]

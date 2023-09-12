FROM oven/bun:1.0.0

ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN

ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN

RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
ADD package.json bun.lockb ./
RUN bun install
ADD . .
RUN bun run build
RUN sed -i'' -e "s/import http from 'http'/import http from 'http2'/g" build/index.js

FROM oven/bun:1.0.0

WORKDIR /workspace
ADD package.json bun.lockb ./
RUN bun install --production --ignore-scripts

FROM gcr.io/distroless/nodejs18-debian11

ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=0
ENV ADDRESS_HEADER=X-Real-Ip

WORKDIR /app
ADD package.json ./
COPY --from=0 /workspace/build .
COPY --from=1 /workspace/node_modules ./node_modules
CMD ["index.js"]

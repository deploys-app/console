FROM registry.deploys.app/public/builder

WORKDIR /workspace
ADD .tool-versions ./
RUN asdf install

ADD package.json bun.lock ./
ADD svelte.config.js ./
RUN bun install --frozen-lockfile
ADD . .
RUN bun run build
# Serve the build over h2c (cleartext HTTP/2) instead of adapter-node's HTTP/1.1
# entrypoint. server.js lives next to handler.js/env.js inside the build output.
RUN cp server.js build/server.js

FROM oven/bun:1.3.14-distroless

ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=Infinity
ENV ADDRESS_HEADER=X-Real-Ip

WORKDIR /app
COPY --from=0 /workspace/build .
CMD ["server.js"]

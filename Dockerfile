FROM registry.moonrhythm.io/builder

WORKDIR /workspace
ADD .tool-versions ./
RUN asdf install

ENV ADAPTER=node

ADD package.json bun.lockb ./
ADD svelte.config.js ./
RUN bun install --frozen-lockfile
ADD . .
RUN bun -b run build
# RUN sed -i'' -e "s/import http from 'http'/import http from 'http2'/g" build/index.js

FROM gcr.io/distroless/nodejs20-debian11

ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=0
ENV ADDRESS_HEADER=X-Real-Ip

WORKDIR /app
ADD package.json ./
COPY --from=0 /workspace/build .
CMD ["index.js"]

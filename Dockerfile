FROM node:18-slim

WORKDIR /workspace
ADD package.json yarn.lock .yarnrc.yml ./
ADD .yarn .yarn
RUN yarn workspaces focus
ADD . .
RUN yarn build
RUN sed -i'' -e "s/import http from 'http'/import http from 'http2'/g" build/index.js

FROM node:18-slim

WORKDIR /workspace
ADD package.json yarn.lock .yarnrc.yml ./
ADD .yarn .yarn
RUN yarn workspaces focus --production

FROM gcr.io/distroless/nodejs18-debian11

ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=0
ENV ADDRESS_HEADER=X-Real-Ip

WORKDIR /app
ADD package.json ./
COPY --from=0 /workspace/build .
COPY --from=1 /workspace/node_modules ./node_modules
CMD ["index.js"]

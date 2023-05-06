FROM node:18-slim

ENV NODE_ENV=production

WORKDIR /workspace
ADD package.json yarn.lock .yarnrc.yml ./
ADD .yarn .yarn
RUN yarn install
ADD . .
RUN yarn build

FROM node:18-slim

ENV NODE_ENV=production
ENV BODY_SIZE_LIMIT=0
ENV ADDRESS_HEADER=X-Real-Ip

WORKDIR /app
ADD package.json ./
COPY --from=0 /workspace/build .
CMD ["index.js"]

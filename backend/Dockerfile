FROM node:24.16.0-slim AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM build AS migrate
ENV DATABASE_URL=
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24.16.0-slim AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
  && npm pkg delete devDependencies \
  && npm prune --omit=dev --omit=peer --ignore-scripts

FROM node:24.16.0-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-deps --chown=node:node /app/package.json ./
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 9000
CMD ["node", "dist/main.js"]

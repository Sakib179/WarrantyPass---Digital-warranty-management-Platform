FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json prisma.config.ts ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --no-frozen-lockfile

FROM dependencies AS dev
COPY . .
EXPOSE 4000
CMD ["pnpm", "--filter", "@warrantypass/api", "dev"]

FROM dependencies AS builder
COPY . .
# Prisma generation reads the datasource while loading prisma.config.ts, but
# generation never connects to it. Runtime DATABASE_URL remains mandatory.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm db:generate
RUN pnpm turbo run build --filter=@warrantypass/api

FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /workspace /workspace
EXPOSE 4000
USER node
CMD ["node", "apps/api/dist/server.js"]

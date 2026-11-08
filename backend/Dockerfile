FROM node:22-bookworm-slim AS build
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci --include=dev
COPY backend/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000
WORKDIR /app
COPY --chown=node:node --from=build /build/backend/node_modules ./node_modules
COPY --chown=node:node --from=build /build/backend/.medusa/server ./
COPY --chown=node:node backend/static ./static
COPY --chown=node:node backend/data ./data
COPY --chown=node:node backend/deploy-start.mjs ./deploy-start.mjs
USER node
EXPOSE 10000
CMD ["node", "deploy-start.mjs"]

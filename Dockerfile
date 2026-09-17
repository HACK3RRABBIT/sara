FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=8080
ENV PORT=8080
COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/scripts/migration-plan.mjs ./scripts/migration-plan.mjs
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["./entrypoint.sh"]

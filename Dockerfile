FROM mcr.microsoft.com/devcontainers/javascript-node:4.0.3-20-bookworm AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM mcr.microsoft.com/devcontainers/javascript-node:4.0.3-20-bookworm AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=/api/
ARG NEXT_PUBLIC_BASE_URL=/
ARG API_INTERNAL_URL=http://api:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN npm run build

FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER $APP_UID
EXPOSE 3000
CMD ["node", "server.js"]

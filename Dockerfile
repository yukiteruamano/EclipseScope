# ---- build stage ------------------------------------------------------------
FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /app

# Dependencias primero (capa cacheable)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Código y build
COPY . .
RUN pnpm build

# ---- runtime stage ----------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]

FROM node:24.16.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_GATEHOUSE_ISSUER
RUN : "${VITE_GATEHOUSE_ISSUER:?set the VITE_GATEHOUSE_ISSUER build arg}" && npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

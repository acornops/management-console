FROM node:22-slim AS build
WORKDIR /app

ARG VITE_APP_BASE_PATH=/
ENV VITE_APP_BASE_PATH=${VITE_APP_BASE_PATH}
ARG VITE_APP_DATA_MODE=control-plane
ENV VITE_APP_DATA_MODE=${VITE_APP_DATA_MODE}
ARG VITE_CONTROL_PLANE_API_BASE_URL=
ENV VITE_CONTROL_PLANE_API_BASE_URL=${VITE_CONTROL_PLANE_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim AS dev
WORKDIR /app

ARG VITE_APP_BASE_PATH=/
ENV VITE_APP_BASE_PATH=${VITE_APP_BASE_PATH}
ARG VITE_APP_DATA_MODE=control-plane
ENV VITE_APP_DATA_MODE=${VITE_APP_DATA_MODE}
ARG VITE_CONTROL_PLANE_API_BASE_URL=http://localhost:8081
ENV VITE_CONTROL_PLANE_API_BASE_URL=${VITE_CONTROL_PLANE_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
RUN chown 101:101 /etc/nginx/conf.d/default.conf
USER 101

EXPOSE 8080

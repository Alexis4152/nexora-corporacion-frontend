# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# URL del API (Build Variable en Coolify): se incrusta al compilar; si cambia, hay que volver a desplegar.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Runtime: nginx sirve el build con fallback SPA ----
FROM nginx:1.27-alpine
ARG VITE_API_URL
COPY nginx.conf /etc/nginx/conf.d/default.conf
# La CSP solo permite conectarse al propio sitio y al origen del API (https://api-...); con /api queda vacío.
RUN ORIGIN=$(printf '%s' "$VITE_API_URL" | sed -nE 's#^(https?://[^/]+).*#\1#p') \
 && sed -i "s#__API_ORIGIN__#${ORIGIN}#g" /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

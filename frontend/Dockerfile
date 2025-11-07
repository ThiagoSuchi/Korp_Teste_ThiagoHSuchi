# Multi-stage build para a aplicação Angular
FROM node:20-alpine AS build
WORKDIR /app

# Instala dependências com cache aproveitável
COPY package.json package-lock.json ./
RUN npm ci

# Copia o restante do código e gera build de produção
COPY . .
RUN npm run build -- --configuration=production

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Remove arquivos padrão do Nginx e copia build
RUN rm -rf ./*
COPY --from=build /app/dist/project-korp/browser ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

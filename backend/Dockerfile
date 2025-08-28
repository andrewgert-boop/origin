# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Создаём папку для логов
RUN mkdir -p /app/logs

COPY . .

# Даём права пользователю node
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]
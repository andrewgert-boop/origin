# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости (в Linux!)
COPY package*.json ./
RUN npm ci --include=dev

# Копируем исходный код
COPY . .

# Собираем проект — esbuild установится для linux-arm64
RUN npm run build

# Устанавливаем serve
RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-s", "dist", "-p", "5173", "--single"]
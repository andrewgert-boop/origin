# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# 1. Копируем только package.json
COPY package*.json ./

# 2. Устанавливаем зависимости ВНУТРИ контейнера (под linux-arm64)
RUN npm ci --include=dev

# 3. Копируем исходники
COPY . .

# 4. Собираем (esbuild установится для linux-arm64)
RUN npm run build

# 5. Устанавливаем serve
RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-s", "dist", "-p", "5173", "--single", "--no-clipboard", "--no-compression"]
FROM node:18-alpine

WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Используем esbuild-wasm для совместимости
RUN npm install esbuild-wasm
ENV USE_WASM=true

# Копируем код
COPY . .

# Собираем с esbuild-wasm
RUN npm run build

# Сервим
RUN npm install -g serve
CMD ["serve", "-s", "dist"]
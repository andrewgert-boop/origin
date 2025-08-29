# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Устанавливаем esbuild-wasm для совместимости с Apple Silicon (arm64)
RUN npm install esbuild-wasm

COPY . .

# Используем esbuild-wasm вместо нативного esbuild
ENV ESBUILD_BINARY_NAME=esbuild-wasm

# Сборка проекта
RUN npm run build

# Устанавливаем serve для раздачи статики
RUN npm install -g serve

# Запуск сервера
CMD ["serve", "-s", "dist"]

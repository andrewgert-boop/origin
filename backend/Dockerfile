FROM node:18-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости (только production)
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаём пользователя node для безопасности
RUN chown -R node:node /app
USER node

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
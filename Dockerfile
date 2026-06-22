FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]

FROM dependencies AS build

COPY . .
RUN npm run build

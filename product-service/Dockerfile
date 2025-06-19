# Dockerfile — production
FROM node:18-alpine as build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Final image
FROM node:18-alpine

WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev

USER node
CMD ["node", "dist/index.js"]

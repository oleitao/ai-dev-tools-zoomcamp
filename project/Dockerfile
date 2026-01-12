FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./package.json
COPY openapi.yaml ./openapi.yaml
COPY src ./src

EXPOSE 3000
CMD ["node", "src/server.js"]


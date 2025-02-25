FROM node:18-alpine

WORKDIR /app/server/

COPY package*.json ./
RUN npm install

CMD ["npm", "run", "dev"]
FROM node:18-alpine

WORKDIR /app/client/client/

COPY ./client/package*.json ./
RUN npm install

CMD ["npm", "start"]
FROM node:19.8.1-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install -g nodemon 
RUN npm install

COPY . .
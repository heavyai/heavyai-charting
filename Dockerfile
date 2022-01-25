FROM node:12.16.1

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY . .

RUN npm ci

EXPOSE 8080

CMD ["npm", "start"]

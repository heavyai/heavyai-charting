FROM node:12.16.1

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY dist/ ./dist
COPY example/ ./example
COPY scripts/ ./scripts
COPY scss/ ./scss
COPY src/ ./src
COPY test/ .
COPY .babelrc .
COPY .eslintrc.js .
COPY index.js .
COPY mapdc.css .
COPY webpack.config.js .
COPY sonar-project.properties .

RUN npm ci

EXPOSE 8080

CMD ["npm", "start"]

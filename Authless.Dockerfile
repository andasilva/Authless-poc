FROM node:14-alpine as builder

WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000

#RUN npm run start
CMD ["node", "./bin/www"]
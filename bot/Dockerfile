FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 3000

# ENTRYPOINT ["./entrypoint.sh"]
CMD ["./entrypoint.sh"]

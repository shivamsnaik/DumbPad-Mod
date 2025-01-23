FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create data directory
RUN mkdir -p data

EXPOSE 3000

CMD ["npm", "start"] 
FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create data directory and ensure it's a volume
VOLUME /app/data

EXPOSE ${PORT}

CMD ["npm", "start"] 

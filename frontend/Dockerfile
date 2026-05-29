FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create a non-root user and grant ownership of the app directory
RUN mkdir -p /home/node/app && chown -R node:node /home/node
COPY --chown=node:node . /home/node/app
WORKDIR /home/node/app

ENV NODE_ENV=development
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

EXPOSE 3000

USER node
CMD ["npm", "run", "dev"]

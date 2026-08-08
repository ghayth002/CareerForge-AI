FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy app files
COPY server.js ./
COPY public/ ./public/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server.js"]

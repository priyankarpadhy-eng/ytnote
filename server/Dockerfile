FROM mcr.microsoft.com/playwright:v1.41.2-jammy

WORKDIR /app

COPY package.json ./
# Install deps (including aws-sdk which we just added)
RUN npm install

COPY . .

# Railway provides PORT env var, we must listen on it.
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]

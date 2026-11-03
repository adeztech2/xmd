FROM node:20-slim

# The download commands invoke yt-dlp and ffmpeg directly. Install both in the
# runtime image so .play/.video/.dl can work after deployment.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates yt-dlp ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

RUN mkdir -p /app/session && chmod -R 777 /app/session

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--max-old-space-size=400", "index.js"]

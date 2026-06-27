# Bun 1.x (latest). Note: Bun 1.1.x has a broken createPublicKey(ed25519
# private key) used for proof signing — stay on a current 1.x.
FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "src/server.ts"]

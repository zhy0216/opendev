FROM oven/bun:1-alpine

# Install Node.js (needed for claude-code and npm global installs)
RUN apk add --no-cache nodejs npm git

# Install Claude Code CLI and ACP adapter globally
RUN npm install -g @anthropic-ai/claude-code @zed-industries/claude-code-acp

# Copy sandbox server source
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production
COPY src/ ./src/

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]

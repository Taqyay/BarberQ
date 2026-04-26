# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for tsc/vite)
RUN npm install

# Copy source code
COPY . .

# Build Vite frontend
RUN npm run build

# --- Stage 2: Production Server ---
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies (exclude devDeps for smaller image)
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend from Stage 1
COPY --from=builder /app/dist/ ./dist/

# Set Environment Variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run sets this dynamically, but 8080 is default)
EXPOSE 8080

# Run the server
CMD ["node", "server/index.js"]

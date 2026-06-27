# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production backend ───────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
# better-sqlite3 needs a native build; node-gyp needs python + make + g++
RUN apk add --no-cache python3 make g++ && npm ci --omit=dev

COPY backend/ ./

# Copy question banks (repo root /questions) into the location questions-store.js expects
COPY questions/ /app/questions/

# Copy built frontend into the location the backend expects
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Railway injects PORT; default to 3001 for local testing
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]

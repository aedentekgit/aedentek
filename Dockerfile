# =====================================================================
# Aedentek CRM (Tessly) — multi-stage image
#   Stage 1: build the Vite/React frontend -> dist/
#   Stage 2: production Node backend that also serves the SPA + uploads
# =====================================================================

# ---------- Stage 1: build frontend ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
ENV PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
COPY frontend/package*.json ./
# `npm install` pulls dev deps (vite) needed to build; Chromium download is
# skipped (puppeteer is only used by local UI test suites, not the build).
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend runner ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# Pre-built SPA is served by the backend (same origin as the API)
COPY --from=frontend-builder /app/frontend/dist ./public
# Per-environment uploads directory (bind-mounted per service -> isolation)
RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["node", "src/server.js"]

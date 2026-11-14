# =====================================================================
# Aedentek CRM (Tessly) — production image
#
#   Node backend (Express + Mongoose) that ALSO serves the SPA + uploads.
#   The frontend is HAND-MAINTAINED (raw frontend/ files: index.html +
#   assets/*.js|css with standalone global-themed-controls.js,
#   signin-styles.css, date-range.js). We serve THAT source directly —
#   exactly what the dev server (:3000) serves — instead of a Vite
#   `npm run build` dist (which omits the standalone files and rewrites
#   filenames, breaking the app on the VPS).
# =====================================================================
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# ---- backend ----
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# ---- frontend: raw source, served by the backend ----
# .dockerignore excludes node_modules/dist/test/test-reports, so this is
# index.html + assets/ + favicon + the standalone global-controls scripts.
COPY frontend/ ./public

# per-environment uploads (bind-mounted per service -> isolation)
RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["node", "src/server.js"]

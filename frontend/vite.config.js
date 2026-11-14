import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: [
        '**/test-reports/**',
        '**/test/**',
        '**/dist/**',
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.gif',
        '**/*.svg',
        '**/*.ico',
        '**/*.json',
        '**/*.md',
        '**/*.log',
        '**/.git/**',
        '**/.DS_Store',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: 'tessly-live-reload',
      // Never let the browser cache dev assets, and hard-reload the page
      // whenever any served asset (css/js/html) changes on disk.
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          next();
        });
        server.watcher.add([path.resolve('assets/**/*'), path.resolve('index.html')]);
        const reload = (file) => {
          if (/\.(css|js|mjs|html|json|svg)$/.test(file) && !file.includes('node_modules') && !file.includes(`${path.sep}dist${path.sep}`)) {
            server.ws.send({ type: 'full-reload', path: '*' });
          }
        };
        server.watcher.on('change', reload);
        server.watcher.on('add', reload);
      },
    },
    {
      name: 'tessly-routes-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Allow /tessly/assets/... to point directly to /assets/...
          if (req.url && req.url.startsWith('/tessly/assets/')) {
            req.url = req.url.replace('/tessly/assets/', '/assets/');
          } else if (req.url && (req.url === '/tessly' || req.url === '/tessly/' || req.url.startsWith('/tessly/#'))) {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
  ],
});

// @ts-check
import { defineConfig } from 'astro/config';

// Static build only: `npm run build` writes a self-contained site to dist/
// that is uploaded as-is to the shared webspace (no Node.js at runtime).
export default defineConfig({
  site: 'https://matrix.aboutusmedia.de',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  // Load a page's HTML as soon as a link is hovered, so the switch is near-instant.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});

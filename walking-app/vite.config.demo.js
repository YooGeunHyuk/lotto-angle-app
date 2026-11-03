import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Portable single-file build: inlines JS+CSS into one index.html that opens
// directly in any mobile browser (no server, no service worker). For sharing
// a testable demo — the installable PWA build stays in vite.config.js.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-demo',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
})

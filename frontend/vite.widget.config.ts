import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget.tsx'),
      name: 'HHUChat',
      fileName: 'widget',
      formats: ['umd'],
    },
    rollupOptions: {
      output: {
        banner: "if(typeof globalThis!=='undefined'&&!globalThis.process){globalThis.process={env:{NODE_ENV:'production'}};}",
      },
    },
    cssCodeSplit: false,
    minify: true,
  },
})

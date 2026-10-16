import{defineConfig}from'vite';import{resolve}from'node:path';export default defineConfig({build:{rollupOptions:{input:{three:resolve('three.html'),deck:resolve('deck.html')}}}});

import { defineConfig } from 'tsup';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    instrument: 'src/instrument.ts',
  },
  format: ['esm'],
  target: 'node20', // Ensure compatibility with modern Node
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  dts: false, // Set to false to speed up build on Render
  // Keep all dependencies external, but bundle internal code
  external: Object.keys(pkg.dependencies || {}),
  // Ensure we handle environment variables and other node-specifics
  platform: 'node',
  outDir: 'dist',
});

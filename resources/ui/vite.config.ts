// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve(__dirname, 'src/pages'),
  publicDir: resolve(__dirname, 'public'),
  //plugins: [react()],
  server: {
    port: 8080,
  },
  resolve: {
    // https://github.com/aws-amplify/amplify-js/issues/9639
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    },
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, './dist'),
    sourcemap: true,
    rollupOptions: {
      input: {
        home: resolve(__dirname, './src/pages/index.html'),
      },
    },
  },
});

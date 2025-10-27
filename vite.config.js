import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path"


export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: 'build', // CRA's default build output
    },
    server: {
        host: "localhost", // your local IP
        port: 5173,            // or any port you like
    }
});
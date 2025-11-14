import path from "node:path";
import { defineConfig } from "vite";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { Config } from "../server/src/config";

export default defineConfig({
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                assetFileNames(assetInfo) {
                    let path = "assets";
                    switch (assetInfo.name?.slice(-3)) {
                        case "css":
                            path = "css";
                            break;
                        case "svg":
                        case "png":
                            path = "img";
                            break;
                        case "mp3":
                            path = "sounds";
                            break;
                        case "ttf":
                            path = "fonts";
                    }
                    return `${path}/[name]-[hash][extname]`;
                },
                entryFileNames: "js/app-[hash].js",
                chunkFileNames: "js/[name]-[hash].js",
            },
        },
    },
    plugins: [
        ViteImageOptimizer({
            test: /\.(svg)$/i,
            logStats: false,
        }),
    ],
    resolve: {
        alias: {
            "@common": path.resolve(import.meta.dirname, "../common/src"),
        },
    },
    server: {
        port: 3000,
        host: "0.0.0.0",
    },
    preview: {
        port: 3000,
        host: "0.0.0.0",
        proxy: {
            "/server_info": {
                target: `http://${Config.host}:${Config.port}`,
                changeOrigin: true,
                secure: false,
            },
            "/play": {
                target: `http://${Config.host}:${Config.port}`,
                changeOrigin: true,
                secure: false,
                ws: true,
            },
        },
    },
});

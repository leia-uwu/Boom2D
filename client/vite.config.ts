import { defineConfig, splitVendorChunkPlugin } from "vite";

export default defineConfig({
    server: {
        port: 3000,
        host: "0.0.0.0"
    },
    preview: {
        port: 3000,
        host: "0.0.0.0"
    },
    plugins: [splitVendorChunkPlugin()]
});

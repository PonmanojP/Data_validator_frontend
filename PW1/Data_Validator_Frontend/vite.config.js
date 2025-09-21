import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allow access from network
  },
  preview: {
    host: true,
  },
  // Allow your Render domain
  // This is for production build, so requests from this host are accepted
  server: {
    allowedHosts: ["pwfrontend.onrender.com", "localhost", "127.0.0.1"]
  }
});
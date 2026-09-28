import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  server: {
    host: true, // Libera acesso para todos os dispositivos na mesma rede local
    port: 5173,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        jogo: resolve(__dirname, "jogo.html"),
        jogoajogo: resolve(__dirname, "jogoajogo.html"),
        resultados: resolve(__dirname, "resultados.html"),
        config: resolve(__dirname, "config.html"),
        acompanhar: resolve(__dirname, "acompanhar.html"),
        tabela: resolve(__dirname, "tabela.htm"),
        geradorTimes: resolve(__dirname, "GeradorTimes.html"),
        login: resolve(__dirname, "login.html")
      }
    }
  }
});

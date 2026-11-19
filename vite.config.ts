import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  // The layout page and its save route are dev only (note 87): `layout.html`
  // is not a build input, and this plugin applies to `vite serve` only. It
  // loads the route code lazily through the dev server, so the config itself
  // imports nothing from `src/`.
  plugins: [
    {
      name: "elderglen-layout",
      apply: "serve",
      configureServer(server) {
        let handler:
          | ((req: never, res: never, next: () => void) => Promise<void>)
          | undefined;
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? "";
          if (!url.startsWith("/__layout/")) return next();
          if (!handler) {
            const mod = await server.ssrLoadModule("/src/layout/devserver.ts");
            handler = mod.layoutHandler(server.config.root);
          }
          await handler!(req as never, res as never, next);
        });
      },
    },
  ],
  test: { include: ["tests/**/*.test.ts"] },
});

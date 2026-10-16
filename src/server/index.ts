import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createApp } from "./server.js";

const CONFIG_PATH = process.env.CONFIG_PATH ?? "./config.json";
const PORT = Number(process.env.PORT ?? 8787);

const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = resolve(here, "../../web/dist");

const app = await createApp(CONFIG_PATH, WEB_DIR);
app.listen(PORT, () => {
  console.log(`peugeocik API on http://localhost:${PORT}`);
  console.log(`  GET  /api/meta /api/config /api/matches`);
  console.log(`  PUT  /api/config`);
  console.log(`  POST /api/scan`);
});

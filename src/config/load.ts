import { readFile } from "node:fs/promises";
import { configSchema, type Config } from "./schema.js";

/** Load and validate config.json. Throws a readable error on invalid config. */
export async function loadConfig(path: string): Promise<Config> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Config not found at ${path}. Copy config.example.json to config.json.`);
    }
    throw err;
  }

  const json = JSON.parse(raw);
  const result = configSchema.safeParse(json);
  if (!result.success) {
    throw new Error("Invalid config:\n" + JSON.stringify(result.error.format(), null, 2));
  }
  return result.data;
}

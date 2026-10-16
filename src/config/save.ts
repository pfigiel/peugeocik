import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { configSchema, type Config } from "./schema.js";

/** Validate and persist config to disk. Throws on invalid config. */
export async function saveConfig(path: string, config: unknown): Promise<Config> {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    const err = new Error("Nieprawidłowa konfiguracja");
    (err as Error & { details?: unknown }).details = result.error.format();
    throw err;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(result.data, null, 2) + "\n", "utf8");
  return result.data;
}

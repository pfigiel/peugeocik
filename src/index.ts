import { loadConfig } from "./config/load.js";
import { Monitor } from "./core/monitor.js";
import { MatchStore } from "./core/store.js";
import { buildNotifiers } from "./notifiers/registry.js";
import { buildPortals } from "./portals/registry.js";

const CONFIG_PATH = process.env.CONFIG_PATH ?? "./config.json";
const ONCE = process.argv.includes("--once");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const config = await loadConfig(CONFIG_PATH);
  const portals = buildPortals();
  const notifiers = buildNotifiers(config.notifiers);
  const store = new MatchStore(config.matchStorePath);
  await store.load();

  const monitor = new Monitor(config, portals, notifiers, store);

  console.log(
    `peugeocik started — ${config.searches.length} search(es), ` +
      `notifiers: ${notifiers.map((n) => n.type).join(", ")}`,
  );

  if (ONCE) {
    await monitor.runOnce();
    return;
  }

  const intervalMs = config.intervalMinutes * 60_000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const started = Date.now();
    try {
      await monitor.runOnce();
    } catch (err) {
      console.error("pass failed:", (err as Error).message);
    }
    const elapsed = Date.now() - started;
    const wait = Math.max(0, intervalMs - elapsed);
    console.log(`next pass in ${Math.round(wait / 60_000)} min`);
    await sleep(wait);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

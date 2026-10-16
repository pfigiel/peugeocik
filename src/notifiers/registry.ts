import type { NotifierConfig } from "../config/schema.js";
import { ConsoleNotifier } from "./console.js";
import { LogFileNotifier } from "./logfile.js";
import { MarkdownNotifier } from "./markdown.js";
import type { Notifier } from "./notifier.js";

/** Instantiate notifiers from config. Register new notifier types here. */
export function buildNotifiers(configs: NotifierConfig[]): Notifier[] {
  return configs.map((c): Notifier => {
    switch (c.type) {
      case "console":
        return new ConsoleNotifier();
      case "logfile":
        return new LogFileNotifier(c.path);
      case "markdown":
        return new MarkdownNotifier(c.path);
    }
  });
}

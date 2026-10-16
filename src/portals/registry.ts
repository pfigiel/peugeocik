import type { Portal } from "./portal.js";
import { OtomotoPortal } from "./otomoto/otomoto.js";
import { OlxPortal } from "./olx/olx.js";

/** All known portals, keyed by name. Register new portals here. */
export function buildPortals(): Map<string, Portal> {
  const portals: Portal[] = [new OtomotoPortal(), new OlxPortal()];
  return new Map(portals.map((p) => [p.name, p]));
}

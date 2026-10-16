import { z } from "zod";

const criteriaSchema = z
  .object({
    make: z.string().optional(),
    model: z.string().optional(),
    priceMin: z.number().nonnegative().optional(),
    priceMax: z.number().nonnegative().optional(),
    yearMin: z.number().int().optional(),
    yearMax: z.number().int().optional(),
    mileageMax: z.number().nonnegative().optional(),
    engineCapacityMin: z.number().positive().optional(),
    enginePowerMin: z.number().positive().optional(),
    fuelTypes: z.array(z.string()).optional(),
    gearbox: z.array(z.string()).optional(),
    bodyTypes: z.array(z.string()).optional(),
    excludeDamaged: z.boolean().optional(),
    registeredInPL: z.boolean().optional(),
    location: z
      .object({ city: z.string().min(1), radiusKm: z.number().positive() })
      .strict()
      .optional(),
  })
  .strict();

const searchSchema = z
  .object({
    name: z.string().min(1),
    portals: z.array(z.string()).min(1),
    criteria: criteriaSchema,
  })
  .strict();

const notifierSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("console") }).strict(),
  z.object({ type: z.literal("logfile"), path: z.string().min(1) }).strict(),
  z.object({ type: z.literal("markdown"), path: z.string().min(1) }).strict(),
]);

export const configSchema = z
  .object({
    intervalMinutes: z.number().positive().default(30),
    matchStorePath: z.string().default("./data/matches.json"),
    searches: z.array(searchSchema).min(1),
    notifiers: z.array(notifierSchema).min(1),
  })
  .strict();

export type Config = z.infer<typeof configSchema>;
export type NotifierConfig = z.infer<typeof notifierSchema>;

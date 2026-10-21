import { z } from "npm:zod@3.23.8";

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

// Cloud config: no notifiers (scan persists to DB intrinsically).
export const configSchema = z
  .object({
    intervalMinutes: z.number().positive().default(30),
    // When true, the scheduled (cron) scan is skipped. Manual scans still run.
    paused: z.boolean().default(false),
    // Email alert recipients. Empty = fall back to NOTIFY_EMAIL_TO secret.
    notifyEmails: z.array(z.string().email()).default([]),
    searches: z.array(searchSchema).min(1),
  })
  .strict();

export type Config = z.infer<typeof configSchema>;

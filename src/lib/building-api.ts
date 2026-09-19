import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const snapshotSchema = z.object({
  units: z.array(z.any()),
  charges: z.array(z.any()),
  payments: z.array(z.any()),
  expenses: z.array(z.any()),
  handoverReceipts: z.array(z.any()),
  settings: z.object({
    buildingName: z.string(),
    address: z.string(),
    manager: z.string(),
    cardNumber: z.string(),
    bank: z.string(),
    baseCharge: z.number(),
    perPerson: z.number(),
    previousManagerReceivable: z.number(),
  }),
  revision: z.number().int().nonnegative().optional(),
});

export const loadBuilding = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { assertAdmin, readBuilding } = await import("@/lib/building.server");
    await assertAdmin(context.userId);
    const data = await readBuilding();
    const { readRevision } = await import("@/lib/building.server");
    return { ...data, revision: await readRevision() };
  });

export const saveBuilding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(snapshotSchema)
  .handler(async ({ context, data }) => {
    const { assertAdmin, writeBuilding } = await import("@/lib/building.server");
    await assertAdmin(context.userId);
    const { revision: baseRevision, ...snapshot } = data;
    const result = await writeBuilding(snapshot, baseRevision);
    // Shape is mirrored by `SaveBuildingResult` in @/lib/store.
    return result.ok ? { ok: true as const, revision: result.revision } : { ok: false as const, revision: result.revision };
  });

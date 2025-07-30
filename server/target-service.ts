import { db } from "./db";
import { targets, buyers } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import type { Target, InsertTarget } from "../shared/schema";

export class TargetService {
  async getTargets(): Promise<Target[]> {
    return await db.select().from(targets);
  }

  async getTarget(id: number): Promise<Target | undefined> {
    const result = await db.select().from(targets).where(eq(targets.id, id));
    return result[0];
  }

  async getTargetsByBuyer(buyerId: number): Promise<Target[]> {
    return await db.select().from(targets).where(eq(targets.buyerId, buyerId));
  }

  async createTarget(data: InsertTarget): Promise<Target> {
    const result = await db.insert(targets).values([data]).returning();
    return result[0];
  }

  async updateTarget(id: number, data: Partial<InsertTarget>): Promise<Target | undefined> {
    const result = await db.update(targets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(targets.id, id))
      .returning();
    return result[0];
  }

  async deleteTarget(id: number): Promise<boolean> {
    const result = await db.delete(targets).where(eq(targets.id, id));
    return (result as any).rowCount > 0;
  }
}

export const targetService = new TargetService();
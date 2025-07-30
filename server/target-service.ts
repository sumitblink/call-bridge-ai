import { db } from "./db";
import { targets, buyers, calls, campaignTargets } from "../shared/schema";
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
    try {
      // Ensure userId is provided
      if (!data.userId) {
        throw new Error('User ID is required');
      }
      
      const result = await db.insert(targets).values(data).returning();
      return result[0];
    } catch (error: any) {
      if (error.code === '23503' && error.constraint === 'targets_buyer_id_fkey') {
        throw new Error(`Buyer with ID ${data.buyerId} does not exist. Please select a valid buyer.`);
      }
      throw error;
    }
  }

  async updateTarget(id: number, data: Partial<InsertTarget>): Promise<Target | undefined> {
    const result = await db.update(targets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(targets.id, id))
      .returning();
    return result[0];
  }

  async deleteTarget(id: number): Promise<boolean> {
    try {
      // First, delete or update dependent records
      await db.transaction(async (tx) => {
        // Update calls to remove target reference (set targetId to null)
        await tx.update(calls)
          .set({ targetId: null })
          .where(eq(calls.targetId, id));
        
        // Delete campaign-target relationships
        await tx.delete(campaignTargets)
          .where(eq(campaignTargets.targetId, id));
        
        // Finally, delete the target
        await tx.delete(targets).where(eq(targets.id, id));
      });
      
      return true;
    } catch (error: any) {
      console.error('Failed to delete target:', error);
      throw new Error('Failed to delete target: ' + error.message);
    }
  }
}

export const targetService = new TargetService();
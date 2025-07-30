// Temporary storage method implementations for buyer companies and targets
import { db } from './db';
import { eq } from 'drizzle-orm';
import { buyerCompanies, buyerTargets } from '@shared/schema';
import type { BuyerCompany, InsertBuyerCompany, BuyerTarget, InsertBuyerTarget } from '@shared/schema';

export const tempBuyerCompanyMethods = {
  async getBuyerCompanies(userId?: number): Promise<BuyerCompany[]> {
    return await db.select().from(buyerCompanies);
  },

  async getBuyerCompany(id: number): Promise<BuyerCompany | undefined> {
    const result = await db.select().from(buyerCompanies).where(eq(buyerCompanies.id, id));
    return result[0];
  },

  async createBuyerCompany(company: InsertBuyerCompany): Promise<BuyerCompany> {
    const result = await db.insert(buyerCompanies).values({
      ...company,
      userId: company.userId || 1
    }).returning();
    return result[0];
  },

  async updateBuyerCompany(id: number, company: Partial<InsertBuyerCompany>): Promise<BuyerCompany | undefined> {
    const result = await db.update(buyerCompanies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(buyerCompanies.id, id))
      .returning();
    return result[0];
  },

  async deleteBuyerCompany(id: number): Promise<boolean> {
    await db.delete(buyerCompanies).where(eq(buyerCompanies.id, id));
    return true;
  },

  async getBuyerTargets(userId?: number): Promise<BuyerTarget[]> {
    return await db.select().from(buyerTargets);
  },

  async getBuyerTarget(id: number): Promise<BuyerTarget | undefined> {
    const result = await db.select().from(buyerTargets).where(eq(buyerTargets.id, id));
    return result[0];
  },

  async getBuyerTargetsByCompany(companyId: number): Promise<BuyerTarget[]> {
    return await db.select().from(buyerTargets).where(eq(buyerTargets.buyerCompanyId, companyId));
  },

  async createBuyerTarget(target: InsertBuyerTarget): Promise<BuyerTarget> {
    const result = await db.insert(buyerTargets).values({
      ...target,
      userId: target.userId || 1,
      buyerCompanyId: target.buyerCompanyId || 1
    }).returning();
    return result[0];
  },

  async updateBuyerTarget(id: number, target: Partial<InsertBuyerTarget>): Promise<BuyerTarget | undefined> {
    const result = await db.update(buyerTargets)
      .set({ ...target, updatedAt: new Date() })
      .where(eq(buyerTargets.id, id))
      .returning();
    return result[0];
  },

  async deleteBuyerTarget(id: number): Promise<boolean> {
    await db.delete(buyerTargets).where(eq(buyerTargets.id, id));
    return true;
  }
};
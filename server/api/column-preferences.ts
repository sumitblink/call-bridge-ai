import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { userColumnPreferences, insertUserColumnPreferencesSchema } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { getDefaultVisibleColumns } from "../../shared/column-definitions.js";

// Custom authentication middleware for session-based auth
const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessionUser;
  next();
};

const router = Router();

// Get user column preferences
router.get("/:tableType", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id as number;
    const { tableType } = req.params;

    const preferences = await db
      .select()
      .from(userColumnPreferences)
      .where(
        and(
          eq(userColumnPreferences.userId, userId),
          eq(userColumnPreferences.tableType, tableType)
        )
      )
      .limit(1);

    if (preferences.length === 0) {
      // Return default preferences if none exist
      const defaultColumns = getDefaultVisibleColumns();
      return res.json({
        visibleColumns: defaultColumns,
        columnOrder: null,
        columnWidths: {}
      });
    }

    const pref = preferences[0];
    res.json({
      visibleColumns: pref.visibleColumns,
      columnOrder: pref.columnOrder,
      columnWidths: pref.columnWidths || {}
    });
  } catch (error) {
    console.error("Error fetching column preferences:", error);
    res.status(500).json({ error: "Failed to fetch column preferences" });
  }
});

// Save user column preferences
router.post("/:tableType", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id as number;
    const { tableType } = req.params;
    
    const bodySchema = z.object({
      visibleColumns: z.array(z.string()).min(1, "At least one column must be visible"),
      columnOrder: z.array(z.string()).optional(),
      columnWidths: z.record(z.string(), z.number()).optional()
    });

    const validatedData = bodySchema.parse(req.body);

    // Check if preferences already exist
    const existing = await db
      .select()
      .from(userColumnPreferences)
      .where(
        and(
          eq(userColumnPreferences.userId, userId),
          eq(userColumnPreferences.tableType, tableType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing preferences
      await db
        .update(userColumnPreferences)
        .set({
          visibleColumns: validatedData.visibleColumns,
          columnOrder: validatedData.columnOrder,
          columnWidths: validatedData.columnWidths,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userColumnPreferences.userId, userId),
            eq(userColumnPreferences.tableType, tableType)
          )
        );
    } else {
      // Create new preferences
      await db.insert(userColumnPreferences).values({
        userId,
        tableType,
        visibleColumns: validatedData.visibleColumns,
        columnOrder: validatedData.columnOrder,
        columnWidths: validatedData.columnWidths
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving column preferences:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to save column preferences" });
  }
});

// Reset column preferences to defaults
router.delete("/:tableType", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id as number;
    const { tableType } = req.params;

    await db
      .delete(userColumnPreferences)
      .where(
        and(
          eq(userColumnPreferences.userId, userId),
          eq(userColumnPreferences.tableType, tableType)
        )
      );

    const defaultColumns = getDefaultVisibleColumns();
    res.json({
      visibleColumns: defaultColumns,
      columnOrder: null,
      columnWidths: {}
    });
  } catch (error) {
    console.error("Error resetting column preferences:", error);
    res.status(500).json({ error: "Failed to reset column preferences" });
  }
});

export default router;
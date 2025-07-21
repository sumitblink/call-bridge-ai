import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
// Custom authentication middleware for session-based auth
const requireAuth = (req: any, res: any, next: any) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessionUser;
  next();
};

const router = Router();

const filtersSchema = z.object({
  dateRange: z.enum(["today", "yesterday", "week", "month", "quarter"]).optional(),
  status: z.string().optional(),
  campaign: z.string().optional(),
  minDuration: z.string().optional(),
  tags: z.string().optional(),
});

// Get enhanced call details with filters
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const filters = filtersSchema.parse(req.query);
    
    // Build date range filter
    let startDate: Date | undefined;
    let endDate: Date = new Date();
    
    switch (filters.dateRange) {
      case "today":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "quarter":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Build additional filters
    const additionalFilters: any = {};
    
    if (filters.status && filters.status !== "all") {
      additionalFilters.status = filters.status;
    }
    
    if (filters.campaign && filters.campaign !== "all") {
      additionalFilters.campaignId = filters.campaign;
    }
    
    if (filters.minDuration) {
      additionalFilters.minDuration = parseInt(filters.minDuration);
    }
    
    if (filters.tags) {
      additionalFilters.tags = filters.tags.split(",").map(tag => tag.trim());
    }

    const calls = await storage.getEnhancedCallsByUser(userId, {
      startDate,
      endDate,
      ...additionalFilters
    });

    res.json(calls);
  } catch (error) {
    console.error("Error fetching enhanced calls:", error);
    res.status(500).json({ error: "Failed to fetch enhanced calls" });
  }
});

// Get call details by ID
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const callId = parseInt(req.params.id);
    
    if (isNaN(callId)) {
      return res.status(400).json({ error: "Invalid call ID" });
    }

    const call = await storage.getEnhancedCallById(callId);
    
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    res.json(call);
  } catch (error) {
    console.error("Error fetching call details:", error);
    res.status(500).json({ error: "Failed to fetch call details" });
  }
});

export default router;
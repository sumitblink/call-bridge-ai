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
import { insertPhoneNumberTagSchema, type PhoneNumberTag, type InsertPhoneNumberTag } from "@shared/schema";

const router = Router();

// Get all phone number tags for the user
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const tags = await storage.getPhoneNumberTagsByUser(userId);
    res.json(tags);
  } catch (error) {
    console.error("Error fetching phone number tags:", error);
    res.status(500).json({ error: "Failed to fetch phone number tags" });
  }
});

// Create a new phone number tag
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const validatedData = insertPhoneNumberTagSchema.parse({
      ...req.body,
      userId,
    });

    const tag = await storage.createPhoneNumberTag(validatedData);
    res.status(201).json(tag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: error.errors });
    } else {
      console.error("Error creating phone number tag:", error);
      res.status(500).json({ error: "Failed to create phone number tag" });
    }
  }
});

// Update a phone number tag
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const tagId = parseInt(req.params.id);
    
    if (isNaN(tagId)) {
      return res.status(400).json({ error: "Invalid tag ID" });
    }

    // Check if tag belongs to user
    const existingTag = await storage.getPhoneNumberTagById(tagId);
    if (!existingTag || existingTag.userId !== userId) {
      return res.status(404).json({ error: "Phone number tag not found" });
    }

    const validatedData = insertPhoneNumberTagSchema.parse({
      ...req.body,
      userId,
    });

    const updatedTag = await storage.updatePhoneNumberTag(tagId, validatedData);
    res.json(updatedTag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: error.errors });
    } else {
      console.error("Error updating phone number tag:", error);
      res.status(500).json({ error: "Failed to update phone number tag" });
    }
  }
});

// Delete a phone number tag
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.user!.id;
    const tagId = parseInt(req.params.id);
    
    if (isNaN(tagId)) {
      return res.status(400).json({ error: "Invalid tag ID" });
    }

    // Check if tag belongs to user
    const existingTag = await storage.getPhoneNumberTagById(tagId);
    if (!existingTag || existingTag.userId !== userId) {
      return res.status(404).json({ error: "Phone number tag not found" });
    }

    await storage.deletePhoneNumberTag(tagId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting phone number tag:", error);
    res.status(500).json({ error: "Failed to delete phone number tag" });
  }
});

export default router;
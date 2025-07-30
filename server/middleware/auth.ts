import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      session: {
        userId?: number;
        user?: any;
      } & any;
    }
  }
}

export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  const sessionUserId = req.session?.userId;
  const sessionUser = req.session?.user;
  
  if (!sessionUserId && !sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Set both user and userId for compatibility with existing code
  req.user = sessionUser || { id: sessionUserId };
  req.session.userId = sessionUserId || sessionUser?.id;
  
  next();
};
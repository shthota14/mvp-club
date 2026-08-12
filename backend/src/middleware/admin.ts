import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

interface JWTPayload { userId: string; email: string; }

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as JWTPayload;
    req.userId = payload.userId;
    const result = await query('SELECT is_admin FROM users WHERE id = $1', [payload.userId]);
    if (!result.rows[0]?.is_admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

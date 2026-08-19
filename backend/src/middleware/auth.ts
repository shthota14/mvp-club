import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  impersonatedBy?: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.userId = payload.userId;
    req.impersonatedBy = payload.impersonatedBy;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// impersonatedBy: when set, this token was minted by an admin to view/act as
// this user rather than the user logging in themselves — kept short-lived
// (2h) rather than the normal 30d session length, as a safety bound.
export const signToken = (userId: string, email: string, impersonatedBy?: string): string =>
  jwt.sign(
    { userId, email, ...(impersonatedBy ? { impersonatedBy } : {}) },
    process.env.JWT_SECRET!,
    { expiresIn: impersonatedBy ? '2h' : '30d' }
  );

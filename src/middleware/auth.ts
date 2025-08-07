import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// İsteğe bağlı kimlik doğrulama - token yoksa anonim kullanıcı
export const authenticateOptional = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = undefined;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    req.user = decoded;
  } catch (error) {
    req.user = undefined;
  }

  next();
};

// Zorunlu kimlik doğrulama - token gerekli
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Giriş gerekli' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Geçersiz token' });
  }
};

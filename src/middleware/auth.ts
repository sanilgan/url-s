import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}
// güvenlik kapısıdır. Web sitesinde "bu kişi giriş yapmış mı?" kontrolü yapan güvenlik görevlisi gibi çalışır.
// İsteğe bağlı kimlik doğrulama - token yoksa anonim kullanıcı
export const authenticateOptional = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = undefined; // Eğer token yoksa, kullanıcı anonim olarak devam eder
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: number; email: string };
    req.user = decoded;
  } catch (error) {
    req.user = undefined;
  }
//Ana sayfa - Giriş yapmadan da URL kısaltılabilir
// URL listesi - Giriş yapmışsa kendi URL'lerini gösterir
// İstatistikler - Giriş yapmışsa detaylı bilgi veri
  next();
};

// Zorunlu kimlik doğrulama - token gerekli
//Token yoksa → 401 Unauthorized hatası döner
// Token geçersizse → 401 Unauthorized hatası döner
// Token geçerliyse → Kullanıcı bilgilerini req.user'a ekler ve devam eder
// Katı kontrol → İsteği durdurur
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Giriş gerekli' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: number; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Geçersiz token' });
  }
};
